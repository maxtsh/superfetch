import Interception from "./Interceptions";

export type URLType = RequestInfo | URL;

export type RequestProps = {
  URL: URLType;
  config?: RequestInit;
};

export type InterceptorRequestFn = (requestProps: RequestProps) => RequestProps;
export type InterceptorResponseFn = (response: Response) => Response;

export type SuperFetchConfigs = {
  timeout?: number;
  baseURL?: string;
  requestConfig?: RequestInit;
  defaultReqInterceptors?: InterceptorRequestFn[];
  defaultResInterceptors?: InterceptorResponseFn[];
};

let signalTimeoutId: ReturnType<typeof setTimeout> | number | null = null;

class SuperFetch {
  defaultConfigs: SuperFetchConfigs = { timeout: 150000 };
  baseFetch = globalThis.fetch;
  interceptors = {
    request: new Interception<InterceptorRequestFn>(),
    response: new Interception<InterceptorResponseFn>(),
  };

  constructor(defaultSuperFetchConfigs: SuperFetchConfigs = {}) {
    if (!this.baseFetch) throw new Error("Fetch API is not available!");

    this.defaultConfigs = defaultSuperFetchConfigs;

    this.loadDefaultInterceptors({
      defaultReqInterceptors: defaultSuperFetchConfigs.defaultReqInterceptors,
      defaultResInterceptors: defaultSuperFetchConfigs.defaultResInterceptors,
    });
  }

  private loadDefaultInterceptors(
    config?: Pick<
      SuperFetchConfigs,
      "defaultReqInterceptors" | "defaultResInterceptors"
    >,
  ) {
    if (config?.defaultReqInterceptors) {
      config.defaultReqInterceptors.forEach((interceptor) => {
        this.interceptors.request.use(interceptor);
      });
    }

    if (config?.defaultResInterceptors) {
      config.defaultResInterceptors.forEach((interceptor) => {
        this.interceptors.response.use(interceptor);
      });
    }
  }

  private createRequestURL(URL: URLType) {
    const newURL = this.defaultConfigs.baseURL
      ? `${this.defaultConfigs.baseURL}` + URL
      : URL;
    return newURL;
  }

  private timeoutController() {
    const controller = new AbortController();

    if (signalTimeoutId) clearTimeout(signalTimeoutId);

    signalTimeoutId = setTimeout(
      () => controller.abort(),
      this.defaultConfigs.timeout,
    );

    return controller;
  }

  async request({
    URL,
    config = this.defaultConfigs.requestConfig,
  }: RequestProps) {
    let reqURL = this.createRequestURL(URL);
    let reqConfig = config;

    const reqInterceptors = this.interceptors.request.handlers;
    const resInterceptors = this.interceptors.response.handlers;

    if (reqInterceptors.length > 0) {
      reqInterceptors.forEach((reqInterceptor) => {
        const newProps = reqInterceptor({ URL: reqURL, config: reqConfig });
        reqURL = newProps.URL;
        reqConfig = newProps.config;
      });
    }

    let response = await this.baseFetch(reqURL, {
      ...reqConfig,
      signal: !reqConfig?.signal
        ? this.timeoutController().signal
        : reqConfig.signal,
    });

    if (signalTimeoutId) clearTimeout(signalTimeoutId);

    if (resInterceptors.length > 0) {
      resInterceptors.forEach((resInterceptor) => {
        response = resInterceptor(response);
      });
    }

    return response;
  }
}

export default SuperFetch;
