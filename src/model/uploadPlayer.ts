export interface ILrc {
  startTime: number,
  endTime: number,
  word: string
}

export interface IUploadData {
  title: string,
  singer: string,
  musicMp3: string,
  musicMp3File: File | null,
  albumCover: string,
  albumCoverFile: File | null,
  bgc: string,
  bgcFile: File | null,
  lrcs: ILrc[],
  lrcsFile: File | null,
  activeLrcColor: string,
  drawColor: string,
}