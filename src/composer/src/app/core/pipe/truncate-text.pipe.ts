import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncateText'
})
export class TruncateTextPipe implements PipeTransform {

  transform(value: string, length: number, wordBoundary: boolean): string {
    const biggestWord = 50
    const elipses = "..."

    let truncatedText = ''
 
    if (wordBoundary) {
      if (typeof value === "undefined") return value
      if (value.length <= length) return value
  
      let truncatedText = value.slice(0, length + biggestWord)
  
      while (truncatedText.length > length - elipses.length) {
          let lastSpace = truncatedText.lastIndexOf(" ")
          if (lastSpace === -1) break
          truncatedText = truncatedText.slice(0, lastSpace).replace(/[!,.?;:]$/, '')
      }

      truncatedText = truncatedText + '&hellip;'
    } else {
      if (value) {
        truncatedText = (value.length > length) ? value.substr(0, length-1) + '&hellip;' : value;
      } else {
        truncatedText = ''
      }
    }
 
   return truncatedText
  }

}
