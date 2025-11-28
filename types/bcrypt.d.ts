declare module "bcrypt" {
  export function hash(data: string | Buffer, saltOrRounds: string | number): Promise<string>
  export function compare(data: string | Buffer, encrypted: string): Promise<boolean>
  export function genSalt(rounds?: number): Promise<string>
  const _default: {
    hash: typeof hash
    compare: typeof compare
    genSalt: typeof genSalt
  }
  export default _default
}
