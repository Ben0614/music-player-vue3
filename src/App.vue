<script setup lang="ts">
</script>

<template>
  <router-link
    to="/SimplePlayer"
    class="simplePlayer"
  >
  SimplePlayer
  </router-link>
  <router-link
    to="/MusicPlayer"
    class="musicPlayer"
  >MusicPlayer
  </router-link>
  <router-link
    to="/UploadPlayer"
    class="uploadPlayer"
  >UploadPlayer
  </router-link>
  <!-- 頁面 -->
  <router-view/>
</template>

<style scoped>

.simplePlayer,
.musicPlayer,
.uploadPlayer {
  font-size: 20px;
  text-decoration-line: none;
  color: #000;
}
.musicPlayer,
.uploadPlayer {
  margin-left: 60px;
}

.uploadPlayer {
  @media screen and (max-width: 959px) {
    margin-left: 0px;
  }
}
</style>
