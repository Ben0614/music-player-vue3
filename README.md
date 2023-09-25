# music-player-vue3

[![vue](https://img.shields.io/badge/vite-4.4.5-green)](https://github.com/vuejs/vue)
[![vue](https://img.shields.io/badge/vue-3.3.4-green)](https://github.com/vuejs/vue)
[![vue](https://img.shields.io/badge/typescript-5.0.2-blue)](https://github.com/vuejs/vue)

## 概述

此專案使用Vite、Vue3、Typescript和原生JavaScript所構成，主要在音樂與歌詞之間做同步處理。

## 安裝

1.克隆此專案到本地

```
git clone https://github.com/Ben0614/music-player-vue3.git
```

2.進入專案目錄

```
cd music-player-vue3
```

3.安裝相依套件

```
yarn install
```

4.運行

```
yarn dev
```

## 使用指南

有分成SimplePlayer和MusicPlayer、UploadPlayer，以下主要介紹MusicPlayer和UploadPlayer的主要功能與使用。

### 標註當前歌詞

播放音樂後，目前正在播放的歌詞會使用不同的顏色進行標註，以便輕鬆跟上音樂。

### 點擊歌詞跳轉

點擊歌詞中的任意一句，音樂將會跳轉到對應的歌詞並繼續播放。

### 重複播放歌詞

在每句歌詞旁邊皆有**三角形**和**正方形**的按鍵，點三角形將會重複播放該句歌詞；如果要取消重複播放就點擊正方形。

### 繪製聲音長條圖

音樂播放時，背景會出現一片聲音長條圖，這是使用AudioContext獲取的數據進行繪製，以可視化音樂的聲音強度。

### 切換歌曲 (僅限MusicPlayer)

點選頁面上方的**上一首**和**下一首**可以切換歌曲，切換後audio和聲音長條圖都會變回預設。

### 本地上傳檔案與設置 (僅限UploadPlayer)

UploadPlayer可以直接上傳用戶本地端的Mp3、專輯圖片、背景圖片、Lrc，並且可以設置歌曲名、歌手、當前歌詞顏色、長條圖顏色，讓操作變得更靈活。
