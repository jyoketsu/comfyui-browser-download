<script lang="ts">
  import { onMount } from 'svelte';
  import { onLoadWorkflow, onScroll, fetchFiles, WHITE_EXTS } from './utils';
  import { t } from 'svelte-i18n';
  import type { FOLDER_TYPES } from './utils';
  import MediaShow from './MediaShow.svelte';
  import type Toast from './Toast.svelte';
  import JSZip from 'jszip';
  import PreviewModal from './PreviewModal.svelte';

  export let comfyUrl: string;
  export let folderType: FOLDER_TYPES;
  export let toast: Toast;
  export let folderPath: string;

  let selectedFiles: string[] = [];
  let isZipping = false;
  let selectedFile: any;

  $: if (folderPath != undefined) {
    refresh();
  }

  $: try {
    searchRegex = new RegExp(searchQuery.toLowerCase());
  } catch {
    searchRegex = new RegExp('');
  }

  let comfyApp: any;
  let files: Array<any> = [];
  let loaded: boolean = true;
  let showCursor = 20;
  let searchQuery = '';
  let searchRegex = new RegExp('');
  let scrollTop = 0;

  $: tt = function (key: string) {
    return $t('filesList.' + key);
  };

  export async function refresh() {
    loaded = false;
    files = await fetchFiles(folderType, comfyUrl, folderPath);
    loaded = true;
  }

  onMount(async () => {
    //@ts-ignore
    comfyApp = window.top.app;

    //@ts-ignore
    window.top.addEventListener('comfyuiBrowserShow', () => {
      refresh();
    });

    folderPath = '';

    window.addEventListener('scroll', (e) => {
      showCursor = onScroll(showCursor, files.length);
      //@ts-ignore
      scrollTop = (e.target.scrollingElement as HTMLElement).scrollTop;
    });
  });

  async function onCollect(file: any) {
    const res = await fetch(comfyUrl + '/browser/collections', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        folder_path: file.folder_path,
        folder_type: folderType,
      }),
    });

    toast.show(
      res.ok,
      tt('fileList.Added to Saves'),
      tt('fileList.Failed to add to Saves'),
    );
  }

  async function scrollToTop() {
    window.scrollTo(0, 0);
  }

  async function onDelete(file: any) {
    const ret = confirm(tt('You want to delete this file?') + ' ' + file.name);
    if (!ret) {
      return;
    }

    const res = await fetch(comfyUrl + '/browser/files', {
      method: 'DELETE',
      body: JSON.stringify({
        folder_type: folderType,
        filename: file.name,
        folder_path: file.folder_path,
      }),
    });

    refresh();
    toast.show(
      res.ok,
      tt('Deleted the file') + file.name,
      tt('Failed to delete the file'),
    );
  }

  async function onClickDir(dir: any) {
    folderPath = dir.path;
  }

  function onClickFile(file: any) {
    console.log('---onClickFile---', file);
    if (file.fileType === 'image') {
      selectedFile = file;
      (
        document.getElementById('image_preview_modal') as HTMLDialogElement
      )?.showModal();
    } else {
      window.open(file.url);
    }
  }

  function onClickPrev() {
    const images = files.filter((f) => f.fileType === 'image');
    const index = images.findIndex((f) => f.name === selectedFile.name);
    if (index === -1) {
      return toast.show(false, '', '当前图片不存在');
    }

    if (index === 0) {
      return toast.show(false, '', '已经是第一张图片');
    }

    selectedFile = images[index - 1];
  }

  function onClickNext() {
    const images = files.filter((f) => f.fileType === 'image');
    const index = images.findIndex((f) => f.name === selectedFile.name);
    if (index === -1) {
      return toast.show(false, '', '当前图片不存在');
    }

    if (index === images.length - 1) {
      return toast.show(false, '', '已经是最后一张图片');
    }

    selectedFile = images[index + 1];
  }

  async function onClickPath(index: number) {
    if (index === -1) {
      folderPath = '';
      return;
    }

    folderPath = folderPath
      .split('/')
      .slice(0, index + 1)
      .join('/');
  }

  async function downloadSelected() {
    const filesToDownload = files.filter(
      (f) => f.type === 'file' && selectedFiles.includes(f.name),
    );

    if (filesToDownload.length === 0) {
      toast.show(false, '', '请先选择要下载的图片');
      return;
    }

    isZipping = true; // 开始压缩
    const zip = new JSZip();

    // for (const file of filesToDownload) {
    //   const fileUrl = file.url;
    //   const response = await fetch(fileUrl);
    //   const blob = await response.blob();
    //   const link = document.createElement('a');
    //   link.href = URL.createObjectURL(blob);
    //   link.download = file.name;
    //   link.click();
    // }
    try {
      // 并行获取所有文件
      const promises = filesToDownload.map(async (file) => {
        const response = await fetch(file.url);
        const blob = await response.blob();
        zip.file(file.name, blob);
      });

      await Promise.all(promises);

      // 生成压缩包
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `download_${Date.now()}.zip`;
      link.click();
    } catch (error) {
      toast.show(false, '', '下载失败');
    } finally {
      isZipping = false;
      selectedFiles = []; // 清空选中
    }
  }
</script>

<div class="max-w-full text-sm breadcrumbs flex flex-row mx-4">
  <ul class="flex-1">
    <li>
      <button on:click={() => onClickPath(-1)}>{$t('common.rootDir')}</button>
    </li>
    {#each (folderPath || '').split('/') as path, index}
      <li><button on:click={() => onClickPath(index)}>{path}</button></li>
    {/each}
  </ul>

  <div class="flex items-center space-x-3">
    <input
      type="text"
      placeholder={tt('searchInput.placeholder')}
      bind:value={searchQuery}
      class="flex-1 input input-bordered h-full rounded-none border-slate-600 text-sm basis-1/4"
    />
    <button
      class="btn btn-sm btn-ghost"
      on:click={() => {
        const visibleFiles = files
          .filter((f) => searchRegex.test(f.name.toLowerCase()))
          .slice(0, showCursor)
          .filter((f) => f.type === 'file');

        if (visibleFiles.every((f) => selectedFiles.includes(f.name))) {
          selectedFiles = [];
        } else {
          selectedFiles = [
            ...new Set([...selectedFiles, ...visibleFiles.map((f) => f.name)]),
          ];
        }
      }}
    >
      {selectedFiles.length > 0 ? '取消全选' : '全选'}
    </button>
    <button
      class="btn btn-primary btn-sm"
      on:click={downloadSelected}
      disabled={selectedFiles.length === 0}
    >
      下载选中
    </button>
  </div>
</div>

<div class="grid grid-cols-4 lg:grid-cols-6 gap-2">
  {#each files
    .filter((f) => searchRegex.test(f.name.toLowerCase()))
    .slice(0, showCursor) as file}
    {#if WHITE_EXTS.includes(file.fileType)}
      <div class="p-2 bg-info-content relative">
        {#if file.type === 'file'}
          <input
            type="checkbox"
            class="checkbox checkbox-xs absolute top-1 right-1 bg-gray-500"
            checked={selectedFiles.includes(file.name)}
            on:change={() => {
              selectedFiles = selectedFiles.includes(file.name)
                ? selectedFiles.filter((n) => n !== file.name)
                : [...selectedFiles, file.name];
            }}
          />
        {/if}
        <div class="flex items-center">
          <MediaShow
            {file}
            styleClass="w-full h-16 sm:h-36"
            {onClickDir}
            {onClickFile}
          />
        </div>

        <p class="font-bold max-h-12 leading-6 overflow-auto mt-1">
          {file.name}
        </p>
        <p class="hidden sm:block text-gray-500 text-xs">
          {file.formattedDatetime}
        </p>
        <p class="hidden sm:block text-gray-500 text-xs">
          {file.formattedSize}
        </p>

        <div class="">
          {#if comfyApp && file.type != 'dir'}
            <button
              class="btn btn-link btn-sm p-0 no-underline text-accent"
              on:click={async () => await onLoadWorkflow(file, comfyApp, toast)}
              >{$t('common.btn.load')}</button
            >
          {/if}
          <button
            class="btn btn-link btn-sm p-0 no-underline text-accent"
            on:click={async () => await onCollect(file)}
            >{$t('common.btn.save')}</button
          >
          <button
            class="btn btn-link btn-sm p-0 no-underline text-error float-right"
            on:click={async () => await onDelete(file)}
          >
            <svg
              class="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 2v4h6v2h-2v14H4V8H2V6h6V2h8zm-2 2h-4v2h4V4zm0 4H6v12h12V8h-4zm-5 2h2v8H9v-8zm6 0h-2v8h2v-8z"
                fill="#f77"
              />
            </svg>
            {$t('common.btn.delete')}
          </button>
        </div>
      </div>
    {/if}
  {/each}
</div>

<div class="flex justify-center">
  {#if files.length > showCursor}
    <button
      on:click={() => (showCursor += 10)}
      class="btn btn-neutral btn-outline">Load more</button
    >
  {:else}
    <p class="text-neutral-content">No more content.</p>
  {/if}
</div>

{#if files.length === 0}
  <div class="w-full h-full flex items-center justify-center">
    <span class="font-bold text-4xl">
      {#if loaded}
        {$t('common.emptyList')}
      {:else}
        {$t('common.loading')}
      {/if}
    </span>
  </div>
{/if}

{#if scrollTop >= 300}
  <button
    class="fixed right-10 bottom-10 w-10 h-10 flex justify-center items-center rounded-full bg-slate-50"
    on:click={scrollToTop}
  >
    <svg
      class="w-5 h-5 icon"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#333333"
        d="M572.235 205.282v600.365a30.118 30.118 0 11-60.235 0V205.282L292.382 438.633a28.913 28.913 0 01-42.646 0 33.43 33.43 0 010-45.236l271.058-288.045a28.913 28.913 0 0142.647 0L834.5 393.397a33.43 33.43 0 010 45.176 28.913 28.913 0 01-42.647 0l-219.618-233.23z"
      />
    </svg>
  </button>
{/if}

<PreviewModal {selectedFile} {onClickNext} {onClickPrev} />
