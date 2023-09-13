<script lang="ts" setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, onUnmounted } from 'vue'
import { ISingData } from '@/model/public'
import { ILrc } from '@/model/simplePlayer'
import singDataJson from '@/data/青いベンチ.json'
import albumCover from '@/assets/images/青いベンチ.jpg'
import bgc from '@/assets/images/青いベンチbgc.jpg'
import musicMp3 from '@/data/青いベンチ.mp3'

const singData: ISingData = reactive(singDataJson)
const lrcs: ILrc[] = reactive([{
  time:0,
  word:'',
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

const interval = ref<NodeJS.Timeout | null>(null)

const audioPlayer = ref<HTMLAudioElement | null>(null)

const activeLrcColor = computed(() => {
  return singData.activeLrcColor
})

// 將時間賦給this.currentTime
const useTimeupdate = ()=>{
  if(audioPlayer.value){
    currentTime.value = audioPlayer.value.currentTime
  }
}

// 播放就調用波型fucntion
const usePlay = () => {
  isPlay.value = true
  resetAlbumCover.value = false
  createWaveForm()
}
// 暫停就清除計時器 不獲取波型資料
const usePause = () => {
  isPlay.value = false
  Number(interval.value)
}
// 播放完畢
const useEnded = () => {
  isPlay.value = false
  resetAlbumCover.value = true
}
// 轉時間格式
const parseTime = (time: string) => {
  const parts = time.split(':')
  return +parts[0] * 60 + +parts[1]
}

  // 判斷是否為現在的歌詞
  const isActive = (lrc: ILrc, lrcIndex:number) => {
    // 不是最後一行
    if (lrcIndex !== lrcs.length - 1) {
      // 播放時間 >= 歌詞開始時間 && 播放時間 < 下一段歌詞開始時間
      if (currentTime.value >= lrc.time && currentTime.value < lrcs[lrcIndex + 1].time) {
        return true
      }
    }
    // 是最後一行
    if (lrcIndex === lrcs.length - 1) {
      // 播放時間 >= 歌詞開始時間
      if (currentTime.value >= lrc.time) {
        return true
      }
    }
  }

  // 跳到這一行
  const goToThisRow = (lrc: ILrc) => {
    if(audioPlayer.value){
      audioPlayer.value.currentTime = lrc.time
      currentTime.value = audioPlayer.value.currentTime
      audioPlayer.value.play()
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

      // isFirst變true
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
        canvasCtx.value.fillStyle = singData.drawColor;
        canvasCtx.value.fillRect(bar_x, bar_y, bar_w, bar_h);
      }
    }
    }
  }

onMounted(()=>{
  setLrc()
  handleAudioPlater()
})

// 處理歌詞
const setLrc = () => {
  // 歌詞陣列 包含時間和歌詞
  singData.startTime.forEach((time, index) => {
    const lrc = {
      // 轉時間格式
      time: parseTime(time),
      word: singData.lyrics[index]
    }
    lrcs.push(lrc)
  })
  console.log('lrcs', lrcs);
}

// 監聽audio
const handleAudioPlater = () => {
  if (audioPlayer.value) {
    // 調小音量
    audioPlayer.value.volume = 0.02
    // 監聽 (第二個function都寫在methods裡再引用過來 否則remove時會有問題)
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

</script>
<script lang="ts">
export default {
  name: 'SimplePlayer',
}
</script>

<template>
    <div>
      <h2 class="title">{{`${singData.title} - ${singData.singer}`}}</h2>
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
          :class="isActive(lrc,lrcIndex) ? 'activeWord' : 'word'"
          @click="goToThisRow(lrc)"
        >{{lrc.word}}
        </h3>
      </div>
    </div>
    <!-- 背景 -->
    <img
      :src="bgc"
      alt=""
      class="bgc"
    >
    <!-- 波型 -->
    <canvas ref="canvas" id="canvas"></canvas>
</template>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #fff;
  margin-top: 60px;
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
.word {
  color: black;
}

.word {
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
