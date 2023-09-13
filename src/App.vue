<script setup lang="ts">
</script>

<template>
  <router-link
    to="/SimplePlayer"
    class="simplePlayer"
  >SimplePlayer</router-link>
  <router-link
    to="/MusicPlayer"
    class="musicPlayer"
  >MusicPlayer</router-link>
  <router-view />
</template>

<style scoped>

.simplePlayer,
.musicPlayer {
  font-size: 20px;
  text-decoration-line: none;
  color: #000;
}
.musicPlayer {
  margin-left: 60px;
}
</style>
