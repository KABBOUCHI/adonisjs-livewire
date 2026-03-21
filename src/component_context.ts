export default class ComponentContext {
  effects: { [key: string]: any } = {}
  memo: { [key: string]: any } = {}

  constructor(
    public component: any,
    public mounting: boolean = false
  ) {}

  addEffect(key: string | { [key: string]: any }, value?: any): void {
    if (typeof key === 'object') {
      Object.entries(key).forEach(([iKey, iValue]) => this.addEffect(iKey, iValue))
      return
    }

    this.effects[key] = value
  }

  pushEffect(key: string, value: any, iKey?: string | number): void {
    if (iKey !== undefined) {
      if (!this.effects[key]) this.effects[key] = {}
      this.effects[key][iKey] = value
    } else {
      if (!this.effects[key]) this.effects[key] = []
      this.effects[key].push(value)
    }
  }

  addMemo(key: string, value: any): void {
    this.memo[key] = value
  }

  pushMemo(key: string, value: any, iKey?: string | number): void {
    if (iKey !== undefined) {
      if (!this.memo[key]) this.memo[key] = {}
      this.memo[key][iKey] = value
    } else {
      if (!this.memo[key]) this.memo[key] = []
      this.memo[key].push(value)
    }
  }
}
