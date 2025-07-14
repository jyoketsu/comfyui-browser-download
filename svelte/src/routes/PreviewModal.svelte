<script lang="ts">
  import Download from './icons/Download.svelte';
  import Expand from './icons/Expand.svelte';
  import Next from './icons/Next.svelte';
  import Prev from './icons/Prev.svelte';
  import RotateLeft from './icons/RotateLeft.svelte';
  import RotateRight from './icons/RotateRight.svelte';
  import ZoomIn from './icons/ZoomIn.svelte';
  import ZoomOut from './icons/ZoomOut.svelte';

  export let selectedFile: any;
  export let onClickNext: Function;
  export let onClickPrev: Function;

  function onClickExpand() {
    if (!selectedFile) return;
    window.open(selectedFile.url);
  }

  async function onClickDownload() {
    if (!selectedFile) return;
    const fileUrl = selectedFile.url;
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = selectedFile.name;
    link.click();
  }

  // 新增状态变量
  let scale = 1;
  let position = { x: 0, y: 0 };
  let isDragging = false;
  let startPos = { x: 0, y: 0 };
  let imgElement: HTMLImageElement;

  // 缩放功能
  function onClickZoomIn() {
    scale = Math.min(scale * 1.2, 4); // 最大放大4倍
  }

  function onClickZoomOut() {
    scale = Math.max(scale / 1.2, 1); // 最小恢复原始尺寸
    if (scale === 1) {
      position = { x: 0, y: 0 }; // 恢复原位
    }
  }

  // 拖拽功能
  function startDrag(event: MouseEvent) {
    isDragging = true;
    startPos = { x: event.clientX - position.x, y: event.clientY - position.y };
    imgElement.style.cursor = 'grabbing';
  }

  function doDrag(event: MouseEvent) {
    if (!isDragging) return;
    position = {
      x: event.clientX - startPos.x,
      y: event.clientY - startPos.y,
    };
  }

  function endDrag() {
    isDragging = false;
    imgElement.style.cursor = scale > 1 ? 'grab' : 'default';
  }

  let rotate = 0; // 新增旋转角度状态

  function onClickRotateLeft() {
    rotate = (rotate - 90 + 360) % 360; // 逆时针旋转90度
  }

  function onClickRotateRight() {
    rotate = (rotate + 90) % 360; // 顺时针旋转90度
  }

  function handleReset() {
    position = { x: 0, y: 0 };
    rotate = 0;
    scale = 1;
  }

  function handlePrev() {
    handleReset();
    onClickPrev();
  }

  function handleNext() {
    handleReset();
    onClickNext();
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<dialog
  id="image_preview_modal"
  class="modal !p-0"
  on:keydown={(e) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
  }}
>
  <div
    class="modal-box w-11/12 max-w-7xl h-3/4 flex flex-col outline-none"
    tabindex="-1"
  >
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold">{selectedFile?.name}</h3>
      <form method="dialog">
        <button class="btn btn-sm btn-circle btn-ghost">✕</button>
      </form>
    </div>
    <div class="relative flex-1 overflow-hidden">
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <img
        src={selectedFile?.previewUrl}
        alt={selectedFile?.name}
        class="w-full h-full object-contain origin-center"
        style="transform: translate({position.x}px, {position.y}px) scale({scale}) rotate({rotate}deg);
               cursor: {scale > 1 ? 'grab' : 'default'};
               touch-action: none;"
        draggable="false"
        on:mousedown={startDrag}
        on:mousemove={doDrag}
        on:mouseup={endDrag}
        on:mouseleave={endDrag}
        bind:this={imgElement}
      />
      <button
        class="btn btn-circle btn-ghost bg-gray-600/40 text-white absolute left-0 top-[calc(50%-24px)]"
        on:click={() => handlePrev()}
      >
        <Prev />
      </button>
      <button
        class="btn btn-circle btn-ghost bg-gray-600/40 absolute right-0 top-[calc(50%-24px)]"
        on:click={() => handleNext()}
      >
        <Next />
      </button>
      <div
        class="w-fit p-1 text-white rounded-lg absolute bottom-4 left-1/2 -translate-x-1/2 flex bg-gray-600/40"
      >
        <button
          class="btn btn-circle btn-ghost"
          on:click={() => onClickZoomIn()}
        >
          <ZoomIn />
        </button>
        <button
          class="btn btn-circle btn-ghost"
          on:click={() => onClickZoomOut()}
        >
          <ZoomOut />
        </button>
        <button
          class="btn btn-circle btn-ghost"
          on:click={() => onClickExpand()}
        >
          <Expand />
        </button>
        <button
          class="btn btn-circle btn-ghost"
          on:click={() => onClickRotateLeft()}
        >
          <RotateLeft />
        </button>
        <button
          class="btn btn-circle btn-ghost"
          on:click={() => onClickRotateRight()}
        >
          <RotateRight />
        </button>
        <button
          class="btn btn-circle btn-ghost"
          on:click={() => onClickDownload()}
        >
          <Download />
        </button>
      </div>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
