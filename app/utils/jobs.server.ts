import { Job, Queue, QueueOptions, Worker, WorkerOptions } from "bullmq";
import { connection } from "../../config/jobs";

type TPayloadOf<Q> = Q extends BaseJob<infer T, any> ? T : never;
type TReturnTypeOf<Q> = Q extends BaseJob<any, infer T> ? T : never;

export abstract class BaseJob<PayloadType = any, ResultType = any> {
  abstract readonly queueName: string;
  private _queue: Queue<PayloadType, ResultType> | undefined;

  startWorker(options?: WorkerOptions) {
    return new Worker<PayloadType, ResultType>(
      this.queueName,
      this.perform,
      options
    );
  }

  performLater(payload: PayloadType): Promise<Job<PayloadType, ResultType>> {
    return this.queue.add(this.getJobName(payload), payload);
  }

  static performLater<T extends BaseJob<TPayloadOf<T>, TReturnTypeOf<T>>>(
    this: { new (options?: QueueOptions): T },
    payload: TPayloadOf<T>
  ) {
    const queue = new this({ connection });
    return queue.performLater(payload);
  }

  static startWorker<T extends BaseJob<TPayloadOf<T>, TReturnTypeOf<T>>>(
    this: { new (): T },
    options: WorkerOptions
  ) {
    const instance = new this();
    return instance.startWorker(options);
  }

  async findMany(limit: number = 100): Promise<Job<PayloadType, ResultType>[]> {
    const jobs = await this.queue.getJobs(
      ["active", "completed", "failed", "delayed", "wait", "paused", "repeat"],
      0,
      limit
    );
    jobs.sort(BaseJob.recentFirst);
    return jobs;
  }

  static findMany<T extends BaseJob<TPayloadOf<T>, TReturnTypeOf<T>>>(
    this: { new (): T },
    limit?: number
  ) {
    const queue = new this();
    return queue.findMany(limit);
  }

  async find(id: string): Promise<Job<PayloadType, ResultType> | undefined> {
    const job = await this.queue.getJob(id);
    return job;
  }

  static find<T extends BaseJob<TPayloadOf<T>, TReturnTypeOf<T>>>(
    this: { new (): T },
    id: string
  ) {
    const queue = new this();
    return queue.find(id);
  }

  protected abstract perform(
    job: Job<PayloadType, ResultType>
  ): Promise<ResultType>;

  protected abstract getJobName(payload: PayloadType): string;

  private get queue(): Queue<PayloadType, ResultType> {
    if (!this._queue) {
      this._queue = new Queue<PayloadType, ResultType>(this.queueName, {
        connection,
      });
    }
    return this._queue;
  }

  private static recentFirst(a: Job, b: Job) {
    return b.timestamp - a.timestamp;
  }
}

export abstract class BaseWorker<PayloadType = any, ResultType = any> {
  abstract readonly queueName: string;
  readonly worker: Worker<PayloadType, ResultType>;

  constructor(options?: WorkerOptions) {
    this.worker = new Worker(this.getQueueName(), this.perform, options);
  }

  protected abstract perform(
    job: Job<PayloadType, ResultType>
  ): Promise<ResultType>;

  private getQueueName() {
    console.log("getting", this.queueName);
    return this.queueName;
  }
}

export abstract class BaseQueue<PayloadType = any, ResultType = any> {
  abstract readonly queueName: string;
  readonly queue: Queue<PayloadType, ResultType>;

  constructor(options?: QueueOptions) {
    this.queue = new Queue(this.getQueueName(), options);
  }

  add(payload: PayloadType): Promise<Job<PayloadType, ResultType>> {
    return this.queue.add(this.getJobName(payload), payload);
  }

  async findManyJobs(
    limit: number = 100
  ): Promise<Job<PayloadType, ResultType>[]> {
    const jobs = await this.queue.getJobs(
      ["active", "completed", "failed", "delayed", "wait", "paused", "repeat"],
      0,
      limit
    );
    jobs.sort(BaseQueue.recentFirst);
    return jobs;
  }

  async findJob(id: string): Promise<Job<PayloadType, ResultType>> {
    const job = await this.queue.getJob(id);
    if (job == null) {
      throw new Response("Not Found", { status: 404 });
    }
    return job;
  }

  static add<T extends BaseQueue<PayloadOf<T>, ReturnTypeOf<T>>>(
    this: { new (options?: QueueOptions): T },
    payload: PayloadOf<T>
  ) {
    const queue = new this({ connection });
    return queue.add(payload);
  }

  static findJob<T extends BaseQueue<PayloadOf<T>, ReturnTypeOf<T>>>(
    this: { new (options?: QueueOptions): T },
    id: string
  ) {
    const queue = new this({ connection });
    return queue.findJob(id);
  }

  static findManyJobs<T extends BaseQueue<PayloadOf<T>, ReturnTypeOf<T>>>(
    this: { new (options?: QueueOptions): T },
    limit?: number
  ) {
    const queue = new this({ connection });
    return queue.findManyJobs(limit);
  }

  private getQueueName() {
    return this.queueName;
  }

  protected abstract getJobName(payload: PayloadType): string;

  private static recentFirst(a: Job, b: Job) {
    return b.timestamp - a.timestamp;
  }
}

type PayloadOf<Q> = Q extends BaseQueue<infer T, any> ? T : never;
type ReturnTypeOf<Q> = Q extends BaseQueue<any, infer T> ? T : never;
