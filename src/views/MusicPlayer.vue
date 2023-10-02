<script lang="ts" setup>
import {ref,reactive,computed,onMounted, onBeforeUnmount , onUnmounted } from 'vue'
import { ISings } from '@/model/public'
import { ILrc } from '@/model/musicPlayer'

import singDataJson from '@/data/おひとりさま天国.json'
import albumCover from '@/assets/images/おひとりさま天国.jpg'
import bgc from '@/assets/images/おひとりさま天国bgc2.jpg'
import musicMp3 from '@/data/おひとりさま天国.mp3'

import singDataJson_2 from '@/data/春泥棒.json'
import albumCover_2 from '@/assets/images/春泥棒.jpg'
import bgc_2 from '@/assets/images/春泥棒bgc.jpg'
import musicMp3_2 from '@/data/春泥棒.mp3'

import singDataJson_3 from '@/data/青いベンチ.json'
import albumCover_3 from '@/assets/images/青いベンチ.jpg'
import bgc_3 from '@/assets/images/青いベンチbgc.jpg'
import musicMp3_3 from '@/data/青いベンチ.mp3'

// 音樂列表
const sings: ISings[] = reactive([
  {
  singData: singDataJson,
  albumCover: albumCover,
  bgc: bgc,
  musicMp3: musicMp3,
  },
  {
  singData: singDataJson_2,
  albumCover: albumCover_2,
  bgc: bgc_2,
  musicMp3: musicMp3_2,
  },
  {
  singData: singDataJson_3,
  albumCover: albumCover_3,
  bgc: bgc_3,
  musicMp3: musicMp3_3,
  },
])
const activeSingIndex = ref(0)
const lrcs: ILrc[] | [] = reactive([{
  startTime: 0,
  endTime:0,
  word: ''
}])
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

const activeLrcColor = computed(()=>{
  return sings[activeSingIndex.value].singData.activeLrcColor
})

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
        canvasCtx.value.fillStyle = sings[activeSingIndex.value].singData.drawColor;
        canvasCtx.value.fillRect(bar_x, bar_y, bar_w, bar_h);
      }
      
    }
  }
}

// 判斷是否disabled切換按鈕
const prevBtnDisabled = computed(() => {
  return activeSingIndex.value <= 0
})
const nextBtnDisabled = computed(() => {
  return sings.length - 1 <= activeSingIndex.value
})

onMounted(() => {
  // 處理歌詞
  setLrc()
  // 監聽audio
  handleAudioPlater()
})

// 處理歌詞
const setLrc = ()=>{
  lrcs.length = 0
  // 歌詞陣列 包含時間和歌詞
  sings[activeSingIndex.value].singData.startTime.forEach((startTime, index) => {
    const lrc = {
      // 轉時間格式
      startTime: parseTime(startTime),
      endTime: parseTime(sings[activeSingIndex.value].singData.endTime[index]),
      word: sings[activeSingIndex.value].singData.lyrics[index]
    }
    lrcs.push(lrc)
  })
  console.log('lrcs', lrcs);
}

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

// 切換歌
const changeSing = (type: string) => {
  if (type === 'prev') {
    activeSingIndex.value -= 1
  }
  if (type === 'next') {
    activeSingIndex.value += 1
  }

  // 切換歌是停止播放
  isPlay.value = false
  // 專輯圖片歸位
  resetAlbumCover.value = true
  // 處理歌詞
  setLrc()
  // 監聽audio
  handleAudioPlater()
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

// 每行歌詞添加ref (每行都相同)
// 如果ref是給單一dom 就用ref<HTMLHeadingElement | null>(null)
// 如果ref是給多個dom 就用reactive<Array<HTMLHeadingElement | null>>([])
const lrcRefs = reactive<Array<HTMLHeadingElement | null>>([])

// 跳到現在播放的那一行
const goToActive = () => {
  if (lrcRefs.length) {
    console.log('lrcRefs', lrcRefs);
    lrcRefs.forEach((lrc, index) => {
      // 找出class有activeWord的歌詞
      if (lrc && lrc.classList.contains('activeWord')) {
        // 獲取它距離頂部的距離
        const activeLrcOffsetTop = (lrcRefs[index] as HTMLHeadingElement).offsetTop

        console.log('activeLrcOffsetTop', activeLrcOffsetTop);
        // 跳過去
        window.scrollTo(0, activeLrcOffsetTop)
      }
    })
  }
}
</script>

<script lang="ts">
export default {
  name: 'MusicPlayer'
}
</script>

<template>
    <button @click="goToActive" class='jump-btn-style'>
      Go to active
    </button>
    <div>
      <button class="change-btn" :disabled="prevBtnDisabled" @click="changeSing('prev')">上一首</button>
      <button class="change-btn ml-3" :disabled="nextBtnDisabled" @click="changeSing('next')">下一首</button>
      <h2 class="title">{{`${sings[activeSingIndex].singData.title} - ${sings[activeSingIndex].singData.singer}`}}</h2>
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
          :src="sings[activeSingIndex].albumCover"
          alt=""
          class="single"
        >
      </div>
      <!-- 音樂播放器 -->
      <audio
        ref="audioPlayer"
        controls
        :src="sings[activeSingIndex].musicMp3"
      />
      <!-- 歌詞 -->
      <div>
        <h3
          v-for="(lrc,lrcIndex) in lrcs"
          :key="lrcIndex"
          :class="isActive(lrc) ? 'activeWord' : 'word'"
          ref="lrcRefs"
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
    <!-- 背景 -->
    <img
      :src="sings[activeSingIndex].bgc"
      alt=""
      class="bgc"
    >
    <!-- 波型 -->
    <canvas ref="canvas" id="canvas"></canvas>
</template>

<style scoped>
.change-btn{
  width: 100px;
  background-color:transparent;
  border:1px solid #000;
  font-weight: 700;
  margin: 20px 0 0 0;
}

.ml-3{
  margin-left: 12px;
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
  animation: rotateSingle 7s linear infinite;
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
