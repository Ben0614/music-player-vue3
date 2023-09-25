<script lang="ts" setup>
import {ref,reactive,onMounted, onBeforeUnmount , onUnmounted } from 'vue'
import { ILrc, IUploadData } from '@/model/uploadPlayer'

const currentTime = ref(0)
// 是否正在播放 (控制專輯圖片旋轉用)
const isPlay = ref(false)
// 讓專輯圖片回復原位 (播放完或切換歌) (控制專輯圖片旋轉用)
const resetAlbumCover = ref(false)
// 波型
const isFirst = ref(false)
const audioCtx = ref<AudioContext | null>(null)
const analyser = ref<AnalyserNode | null>(null)
const source = ref<MediaElementAudioSourceNode | null>(null)
const bufferLength = ref(0)
const dataArray = ref<Uint8Array | null>(null)
// 重複單行
const isRepeat = ref(false)
const rowNumber = ref(0)
const repeatLrc: ILrc = reactive({
  startTime: 0,
  endTime: 0,
  word: ''
})

const interval = ref<NodeJS.Timeout | null>(null)

const audioPlayer = ref<HTMLAudioElement | null>(null)

// 將時間賦給currentTime
const useTimeupdate = ()=>{
  if (audioPlayer.value) {
    currentTime.value = audioPlayer.value.currentTime
    // 單行重複播放 && 播放器時間 >= 此行歌詞的endTime
    if (isRepeat.value && audioPlayer.value.currentTime >= repeatLrc.endTime) {
      // 重新賦startTime給audioPlayer.value.currentTime
      audioPlayer.value.currentTime = repeatLrc.startTime
      currentTime.value = audioPlayer.value.currentTime
    }
  }
  
}
// 播放就調用波型fucntion
const usePlay = ()=>{
  isPlay.value = true
  resetAlbumCover.value = false
  createWaveForm()
}
// 暫停就清除計時器 不獲取波型資料
const usePause = () => {
  isPlay.value = false
  
  clearInterval(Number(interval.value))
}
// 播放完畢
const useEnded = () => {
  isPlay.value = false
  resetAlbumCover.value = true
}
// 轉時間格式
const parseTime = (time:string) => {
  const parts = time.split(':')
  return +parts[0] * 60 + +parts[1]
}
// 判斷是否為現在的歌詞
const isActive = (lrc:ILrc) => {
  // 播放時間 >= 歌詞開始時間 && 播放時間 < 下一段歌詞開始時間
  if (currentTime.value >= lrc.startTime && currentTime.value < lrc.endTime) {
    return true
  }
}
// 跳到這一行
const goToThisRow = (lrc:ILrc) => {
  if(audioPlayer.value){
    audioPlayer.value.currentTime = lrc.startTime
    currentTime.value = audioPlayer.value.currentTime
    audioPlayer.value.play()
  }
}
// 重複單行歌詞
const handleRepeat = (type:string, lrc: ILrc) => {
  // 開啟單行重複播放
  if (type === 'repeat') {
    isRepeat.value = true
    Object.assign(repeatLrc, lrc) 
    if(audioPlayer.value){
      audioPlayer.value.currentTime = lrc.startTime
      currentTime.value = audioPlayer.value.currentTime
      audioPlayer.value.play()
    }
  }
  // 取消重複播放
  if (type === 'cancel') {
    isRepeat.value = false
  }
}

// 獲取波型資料
const createWaveForm = () => {
  // 已獲取過 (不能重複獲取 會噴掉)
  if (isFirst.value) {
    interval.value = setInterval(() => {
      //生成8位為一個item,長度為bufferLength的array 
      dataArray.value = new Uint8Array(bufferLength.value)
      // 將頻率導入到該array 
      if(analyser.value){
        analyser.value.getByteFrequencyData(dataArray.value)
      }
      draw()
    }, 100)
  }
  // 未獲取過
  if (!isFirst.value) {
    audioCtx.value = new AudioContext()
    //利用接口得到分析器 
    analyser.value = audioCtx.value.createAnalyser()
    //得到音源
    if(audioPlayer.value){
      source.value = audioCtx.value.createMediaElementSource(audioPlayer.value)
      // source=>middle 
      source.value.connect(analyser.value)
    }
    //middle=>termial 
    analyser.value.connect(audioCtx.value.destination)
    // 設置傅里葉變化的參數,用來設置分析範圍
    analyser.value.fftSize = 128
    //根據范圍得到不同音頻的數量的長度 
    bufferLength.value = analyser.value.frequencyBinCount
    //生成8位為一個item,長度為bufferLength的array 
    dataArray.value = new Uint8Array(bufferLength.value)
    // 將頻率導入到該array 
    analyser.value.getByteFrequencyData(dataArray.value)

    // 重複獲取更新的資料
    interval.value = setInterval(() => {
      //生成8位為一個item,長度為bufferLength的array 
      dataArray.value = new Uint8Array(bufferLength.value)
      // 將頻率導入到該array 
      if(analyser.value){
        analyser.value.getByteFrequencyData(dataArray.value)
      }
      draw()
    }, 100)

    // isFirst.value變true
    isFirst.value = true
  }
}

// 獲取canvas,canvarCtx
const canvas = ref<HTMLCanvasElement | null>(null)
// 繪製波型
const draw = () => {
  if(canvas.value){
    const canvasCtx = ref<CanvasRenderingContext2D | null>(canvas.value.getContext('2d'))
    // 寬高與螢幕相同
    canvas.value.width = window.innerWidth;
    canvas.value.height = window.innerHeight;

    const bar_w = canvas.value.width / bufferLength.value;
    for (let i = 0; i < bufferLength.value; i++) {
      let bar_x = i * bar_w;
      let bar_h = (dataArray.value![i] / 255) * canvas.value.height;
      let bar_y = canvas.value.height - bar_h
      if(canvasCtx.value){
        canvasCtx.value.fillStyle = drawColor.value;
        canvasCtx.value.fillRect(bar_x, bar_y, bar_w, bar_h);
      }
      
    }
  }
}

onMounted(() => {
  // 監聽audio
  handleAudioPlater()
})

// 監聽audio
const handleAudioPlater = ()=>{
  if (audioPlayer.value) {
    // 調小音量
    audioPlayer.value.volume = 0.02
    // 監聽 (第二個function都寫在外面再引用過來 否則remove時會有問題)
    // 時間變化
    audioPlayer.value.addEventListener('timeupdate', useTimeupdate)
    // 播放
    audioPlayer.value.addEventListener('play', usePlay)
    // 暫停
    audioPlayer.value.addEventListener('pause', usePause)
    // 播放完畢
    audioPlayer.value.addEventListener('ended', useEnded)
  }
}

onBeforeUnmount(()=>{
  // 一定要解除監聽 否則換頁會噴錯
  if(audioPlayer.value){
    audioPlayer.value.removeEventListener('timeupdate', useTimeupdate)
    audioPlayer.value.removeEventListener('play', usePlay)
    audioPlayer.value.removeEventListener('pause', usePause)
    audioPlayer.value.removeEventListener('ended', useEnded)
  }
})

onUnmounted(()=>{
  clearInterval(Number(interval.value))
})

// upload file的btn
const musicMp3Ref = ref<HTMLButtonElement | null>(null)
const albumCoverRef = ref<HTMLButtonElement | null>(null)
const bgcRef = ref<HTMLButtonElement | null>(null)
const lrcsRef = ref<HTMLButtonElement | null>(null)
// upload用
const uploadData: IUploadData = reactive({
  title: '',
  singer: '',
  musicMp3: '',
  musicMp3File: null,
  albumCover: '',
  albumCoverFile: null,
  bgc: '',
  bgcFile: null,
  lrcs:[],
  lrcsFile: null,
  activeLrcColor: '#000000',
  drawColor: '#000000',
})
// 畫面顯示用
const title = ref('')
const singer = ref('')
const musicMp3 = ref('')
const musicMp3File = ref<File | null>(null)
const albumCover = ref('')
const albumCoverFile = ref<File | null>(null)
const bgc = ref('')
const bgcFile = ref<File | null>(null)
let lrcs: ILrc[] | [] = reactive([
  // {
  //   startTime: 0,
  //   endTime:0,
  //   word: ''
  // }
])
const lrcsFile = ref<File | null>(null)
const activeLrcColor = ref('')
const drawColor = ref('')

// mp3
const uploadMp3 = (e: Event) => {
  const files = (e.target as HTMLInputElement).files;

  if (files && files.length) {
    // mp3副檔名
    const exts = ['.mp3']
    const fileExt = files[0].name.substring(files[0].name.lastIndexOf('.'))

    if (!exts.includes(fileExt)) {
      alert('請上傳mp3檔案')

      return
    }
    
    uploadData.musicMp3File = files[0]
    uploadData.musicMp3 = URL.createObjectURL(files[0])
  }
};
// 專輯圖片
const uploadAlbumCover = (e: Event) => {
  const files = (e.target as HTMLInputElement).files;
  const reader = new FileReader();

  if (files && files.length) {
    // 圖片副檔名
    const exts = ['.jpg','.png']
    const fileExt = files[0].name.substring(files[0].name.lastIndexOf('.'))

    if (!exts.includes(fileExt)) {
      alert('請上傳jpg或png檔案')

      return
    }
    // 將file裝入
    uploadData.albumCoverFile = files[0]
    // 將file轉成url顯示
    reader.readAsDataURL(files[0])
    reader.onload = () => {
      uploadData.albumCover = reader.result as string
    }
  }
};
// 背景圖
const uploadBgc = (e: Event) => {
  const files = (e.target as HTMLInputElement).files;
  const reader = new FileReader();

  if (files && files.length) {
    // 圖片副檔名
    const exts = ['.jpg', '.png']
    const fileExt = files[0].name.substring(files[0].name.lastIndexOf('.'))

    if (!exts.includes(fileExt)) {
      alert('請上傳jpg或png檔案')

      return
    }
    // 將file裝入
    uploadData.bgcFile = files[0]
    // 將file轉成url顯示
    reader.readAsDataURL(files[0])
    reader.onload = () => {
      uploadData.bgc = reader.result as string
    }
  }
};
// Lrc
const uploadLrc = (e: Event) => {
  const files = (e.target as HTMLInputElement).files;
  const reader = new FileReader();

  if (files && files.length) {
    // lrc副檔名
    const exts = ['.lrc']
    const fileExt = files[0].name.substring(files[0].name.lastIndexOf('.'))

    if (!exts.includes(fileExt)) {
      alert('請上傳lrc檔案')

      return
    }
    // 將file裝入
    uploadData.lrcsFile = files[0]
    // // 將file轉成字串
    reader.readAsText(files[0])
    reader.onload = () => {
      const lrcString = reader.result as string;
      let lrcArray:string[] = []
      // 根據字串裡的換行符號來分行
      // 不同系統的換行符號會不同 可能是\r\n或\n
      // 現在每一行的格式是字串'[00:00.00]xxxxxxxxxxxxx'
      if(lrcString.includes('\r\n')){
         lrcArray = lrcString.split('\r\n')
      }else{
         lrcArray = lrcString.split('\n')
      }
      // 分隔出時間和歌詞 匹配的是 [00:00.00] 或 [00:00.000]
      const regex = /^\[(\d{2}:\d{2}.\d{2,3})\](.*)$/;
      // 清空uploadData.lrcs
      uploadData.lrcs.length = 0
      lrcArray.forEach((item, index) => {
        // 匹配
        // match格式是陣列 ['[00:00.00]xxxxxxxxxxxxx','[00:00.00]','xxxxxxxxxxxxx']
        const match = item.match(regex);
        const match2 = index + 1 === lrcArray.length ? ['', '59:59.99', ''] : lrcArray[index + 1].match(regex);
        if (match && match2) {
          uploadData.lrcs.push({
            // 轉時間格式
            startTime: parseTime(match[1]),
            endTime: parseTime(match2[1]),
            word: match[2]
          })
        }
      })
    };
  }
};

// 上傳dialog
const uploadDialog = ref(false)
// 判斷是否有上傳了檔案 (有上傳才顯示圖片歌詞和audio等等)
const hasUpload = ref(false)

const openUploadDialog = ()=>{
  uploadData.title = title.value
  uploadData.singer = singer.value
  uploadData.musicMp3 = musicMp3.value
  uploadData.musicMp3File = musicMp3File.value
  uploadData.albumCover = albumCover.value 
  uploadData.albumCoverFile = albumCoverFile.value
  uploadData.bgc = bgc.value
  uploadData.bgcFile = bgcFile.value
  uploadData.lrcs = JSON.parse(JSON.stringify(lrcs))
  uploadData.lrcsFile = lrcsFile.value
  uploadData.activeLrcColor = activeLrcColor.value
  uploadData.drawColor = drawColor.value

  uploadDialog.value = true
}
const closeUploadDialog = ()=>{
  uploadDialog.value = false
}
const UploadSubmit = ()=>{
  title.value = uploadData.title
  singer.value = uploadData.singer
  musicMp3.value = uploadData.musicMp3
  musicMp3File.value = uploadData.musicMp3File
  albumCover.value = uploadData.albumCover
  albumCoverFile.value = uploadData.albumCoverFile
  bgc.value = uploadData.bgc
  bgcFile.value = uploadData.bgcFile
  lrcs = JSON.parse(JSON.stringify(uploadData.lrcs))
  lrcsFile.value = uploadData.lrcsFile
  activeLrcColor.value = uploadData.activeLrcColor
  drawColor.value = uploadData.drawColor

  hasUpload.value = true
  closeUploadDialog()
}

</script>

<script lang="ts">
export default {
  name: 'UploadPlayer'
}
</script>

<template>
    <div>
      <button @click="openUploadDialog" class='btn-style mt-3'>
        <span v-if="!hasUpload">上傳</span>
        <span v-if="hasUpload">編輯</span>
      </button>
      <!-- 上傳dialog -->
      <div v-if="uploadDialog" class="upload-dialog">
        <div class="mb-3">
          <button v-if="musicMp3Ref" @click="musicMp3Ref.click()" class="small-btn-style">mp3檔案</button>
          <span v-if="uploadData.musicMp3File" class="ml-3">{{ uploadData.musicMp3File.name }}</span>
          <input ref="musicMp3Ref" type="file" hidden @change="uploadMp3">
        </div>
        <div class="mb-3">
          <button v-if="albumCoverRef" @click="albumCoverRef.click()" class="small-btn-style">專輯圖片</button>
          <span v-if="uploadData.albumCoverFile" class="ml-3">{{ uploadData.albumCoverFile.name }}</span>
          <input ref="albumCoverRef" type="file" hidden @change="uploadAlbumCover">
        </div>
        <div class="mb-3">
          <button v-if="bgcRef" @click="bgcRef.click()" class="small-btn-style">背景圖</button>
          <span v-if="uploadData.bgcFile" class="ml-3">{{ uploadData.bgcFile.name }}</span>
          <input ref="bgcRef" type="file" hidden @change="uploadBgc">
        </div>
        <div class="mb-3">
          <button v-if="lrcsRef" @click="lrcsRef.click()" class="small-btn-style">Lrc</button>
          <span v-if="uploadData.lrcsFile" class="ml-3">{{ uploadData.lrcsFile.name }}</span>
          <input ref="lrcsRef" type="file" hidden @change="uploadLrc"></div>
        <div class="mb-3">
          <label for="title" >歌曲名</label>
          <input v-model="uploadData.title" id="title" type="text" class="ml-3">
        </div>
        <div class="mb-3">
          <label for="singer">歌手</label>
          <input v-model="uploadData.singer" id="singer" type="text" class="ml-3">
        </div>
        <div class="mb-3">
          <label for="activeLrcColor" >當前歌詞顏色</label>
          <input v-model="uploadData.activeLrcColor" id="activeLrcColor" type="color" class="ml-3">
        </div>
        <div class="mb-3">
          <label for="drawColor" >長條圖顏色</label>
          <input v-model="uploadData.drawColor" id="drawColor" type="color" class="ml-3">
        </div>
        <div :style="{textAlign:'right'}">
          <button @click="closeUploadDialog" class='btn-style'>取消</button>
          <button @click="UploadSubmit" class='btn-style ml-2'>確定</button>
        </div>
      </div>
    
      <!-- 內容區域 -->
      <!-- 
        這邊需要用v-show 不能用v-if
        如果用v-if 一開始handleAudioPlater會監聽不到audio
      -->
      <div v-show="hasUpload">
        <h2 class="title">{{ `${title} - ${singer}` }}</h2>
        <!-- 專輯 -->
        <!--
           1.播放時，添加rotateAnimation讓專輯圖片轉
           2.播放完或切換歌，直接用空''讓專輯圖片歸位
           3.手動停止，添加singlePaused讓專輯圖片不再旋轉
        -->
        <div
          class="singleWrap"
          :class="isPlay ? 'rotateAnimation' : resetAlbumCover ? '' : 'rotateAnimation singlePaused'"
        >
          <img
            :src="albumCover"
            alt=""
            class="single"
          >
        </div>
        <!-- 音樂播放器 -->
        <audio
          ref="audioPlayer"
          controls
          :src="musicMp3"
        />
        <!-- 歌詞 -->
        <div>
          <h3
            v-for="(lrc,lrcIndex) in lrcs"
            :key="lrcIndex"
            :class="isActive(lrc) ? 'activeWord' : 'word'"
            @mouseenter="rowNumber = lrcIndex"
          >
            <!-- 歌詞 -->
            <span @click="goToThisRow(lrc)">{{lrc.word}}</span>
            <!-- 單行重複播放 -->
            <!--
              將object轉成json字串比較
              如果repeatLrc === lrc 就改變這句的三角形按鈕顏色
             -->
            <span
              v-if="rowNumber === lrcIndex"
              :style="{marginLeft:'12px',color: JSON.stringify(repeatLrc) === JSON.stringify(lrc) && isRepeat ? activeLrcColor : ''}"
              @click="handleRepeat('repeat',lrc)"
              class="icon"
            >▶</span>
            <!-- 取消單行重複播放 -->
            <span
              v-if="rowNumber === lrcIndex"
              :style="{marginLeft:'12px'}"
              @click="handleRepeat('cancel',lrc)"
              class="icon"
            >◼</span>
          </h3>
        </div>
      </div>
    </div>
    <!-- 背景 -->
    <img
      v-show="hasUpload"
      :src="bgc"
      alt=""
      class="bgc"
    >
    <!-- 波型 -->
    <canvas ref="canvas" id="canvas"></canvas>
</template>

<style scoped>
.upload-dialog{
  position: fixed;
  top:50%;
  left:50%;
  transform: translate(-50%,-50%);
  border:1px solid #000;
  text-align:left;
  background-color: #fff;
  border-radius: 10px;
  padding: 30px;
  z-index:100000
} 
.mt-3{
  margin-top: 12px;
}
.mb-3{
  margin-bottom: 12px;
}
.ml-2{
  margin-left: 8px;
}
.ml-3{
  margin-left: 12px;
}

.btn-style{
  background-color:transparent;
  border:1px solid #000;
  font-weight: 700;
}
.small-btn-style{
  padding: 5px;
  background-color:transparent;
  border:1px solid #000;
}

.singleWrap {
  height: 300px;
  width: 300px;
  margin: 10px auto;
  border-radius: 50%;
  overflow: hidden;
}

.single {
  height: 100%;
  width: 100%;
}

.rotateAnimation {
  animation: rotateSingle 3s linear infinite;
}

.title,
.word,
.icon {
  color: black;
}

.word,
.icon {
  cursor: pointer;
}

.activeWord {
  color: v-bind(activeLrcColor);
}

.singlePaused {
  animation-play-state: paused;
}

.bgc {
  height: 100%;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: -1;
  opacity: 0.5;
  object-fit: cover;
  /* object-position: top; */
}

#canvas {
  position: fixed;
  top: 0;
  left: 0;
  z-index: -1;
  opacity: 0.5;
}

@keyframes rotateSingle {
  0% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(180deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
