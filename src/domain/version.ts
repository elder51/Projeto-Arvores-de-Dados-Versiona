export class Version {
  public constructor(
    public readonly number: number,
    public readonly time: Date,
    public readonly author: string,
    public readonly comment: string,
    public readonly size: number,
    public readonly hash: string,
    public readonly contentId: string,
  ) {}
}
