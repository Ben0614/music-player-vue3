export interface ISingData {
  title: string,
  singer: string,
  startTime: string[],
  endTime: string[],
  lyrics: string[],
  activeLrcColor: string,
  drawColor: string,
}

export interface ISings {
  singData:ISingData,
  albumCover:string,
  bgc:string,
  musicMp3:string,
}

