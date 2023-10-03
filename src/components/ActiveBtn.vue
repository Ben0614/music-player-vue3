<script setup lang="ts">
import { ref, reactive, toRefs } from 'vue'

interface IProps {
  lrcRefs: Array<HTMLHeadingElement | null>
}

const props = withDefaults(defineProps<IProps>(),{})

const isMobile = ref(false)

if (window.innerWidth >= 960) {
    isMobile.value = false
}
if (window.innerWidth < 960) {
    isMobile.value = true
}

// 跳到現在播放的那一行
const goToActive = () => {
  if (props.lrcRefs.length) {
    props.lrcRefs.forEach((lrc, index) => {
      // 找出class有activeWord的歌詞
      if (lrc && lrc.classList.contains('activeWord')) {
        // 獲取它距離頂部的距離
        const activeLrcOffsetTop = (props.lrcRefs[index] as HTMLHeadingElement).offsetTop

        console.log('activeLrcOffsetTop', activeLrcOffsetTop);
        // 跳過去
        window.scrollTo(0, activeLrcOffsetTop)
      }
    })
  }
}

</script>

<template>
  <button class='jump-btn-style' @click="goToActive">
    <span v-if="!isMobile">Go to active</span>
    <span v-if="isMobile">Go</span>
  </button>
</template>

<style scoped>
.jump-btn-style {
  position: fixed;
  top:50%;
  right:10px;
  transform: translate(0,-50%);
  background-color:transparent;
  border:1px solid #000;
  border-radius: 50% 0 50% 0;
  font-weight: 700;
  @media screen and (max-width: 959px) {
    right: 5px;
    border-radius: 50%;
    padding: 5px
  }
}
</style>
