import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormControl, Validators, FormGroup, FormBuilder } from '@angular/forms'
import { Service, Project, Volume, ServicePort, KeyValuePair } from '../../../../store/models'

@Component({
  selector: 'key-value',
  templateUrl: './key-value.component.html',
  styleUrls: ['./key-value.component.scss']
})
export class KeyValueComponent {
  @Input() set keyValueArray(keyValueArray: KeyValuePair[]) {
    if(keyValueArray && keyValueArray.length) {
    this.currentKeyValuePairs = keyValueArray.map((e) => ({
      key: new FormControl(e.key),
      value: new FormControl(e.value),
    }))
    } else {
      this.currentKeyValuePairs = []
    }
 }

  currentKeyValuePairs: {
    key: FormControl
    value: FormControl
  }[] = []
  constructor() { }

  addPair() {
    this.currentKeyValuePairs.push({
      key: new FormControl(),
      value: new FormControl(),
    })
  }
  removePair(index) {
    this.currentKeyValuePairs.splice(index, 1)
  }

  getKeyValuePaies(): KeyValuePair[] {
    const currentKeyValuePairs = []

    this.currentKeyValuePairs.forEach((pair) => {
      if (pair.key.valid && pair.value.valid) {
        currentKeyValuePairs.push({
          key: pair.key.value,
          value: pair.value.value,
        })
      }
    })

    return currentKeyValuePairs
  }
}
