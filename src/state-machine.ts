export class StateMachine<S extends string> {
  constructor(public state: S) {}
}
