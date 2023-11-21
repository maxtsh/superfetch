import Interception from "./Interceptions";

export type URLType = RequestInfo | URL;

export type RequestConfig = {
  url: URLType;
} & Partial<RequestInit>;

export type InterceptorRequestFn = (
  requestConfig: RequestConfig,
) => RequestConfig;
export type InterceptorResponseFn = (
  response: Promise<Response>,
  reqConfig: RequestConfig,
) => Promise<{ response: Promise<Response>; config: RequestConfig }>;

export type SuperFetchConfigs = Partial<{
  timeout: number;
  baseURL: string;
  requestConfig: Partial<RequestConfig>;
  defaultReqInterceptors: InterceptorRequestFn[];
  defaultResInterceptors: InterceptorResponseFn[];
}>;

let signalTimeoutId: ReturnType<typeof setTimeout> | number | null = null;

class SuperFetch {
  defaultConfig: SuperFetchConfigs;
  baseFetch = globalThis.fetch;
  interceptors = {
    request: new Interception<InterceptorRequestFn>(),
    response: new Interception<InterceptorResponseFn>(),
  };

  constructor(
    defaultSuperFetchConfig: SuperFetchConfigs = { timeout: 150000 },
  ) {
    if (!this.baseFetch) throw new Error("Fetch API is not available!");

    this.baseFetch = this.baseFetch.bind(globalThis);

    this.defaultConfig = defaultSuperFetchConfig;

    this.loadDefaultInterceptors({
      defaultReqInterceptors: defaultSuperFetchConfig.defaultReqInterceptors,
      defaultResInterceptors: defaultSuperFetchConfig.defaultResInterceptors,
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

  private createRequestURL(url: URLType) {
    let newURL = url.toString();
    if (
      this.defaultConfig?.baseURL &&
      !newURL.startsWith(this.defaultConfig.baseURL)
    ) {
      newURL = this.defaultConfig.baseURL + newURL;
    }
    return newURL;
  }

  private timeoutController() {
    const controller = new AbortController();

    if (signalTimeoutId) clearTimeout(signalTimeoutId);

    signalTimeoutId = setTimeout(
      () => controller.abort(),
      this.defaultConfig.timeout,
    );

    return controller;
  }

  async request(config: RequestConfig) {
    let requestConfig: RequestConfig = {
      ...this.defaultConfig.requestConfig,
      ...config,
      headers: {
        ...this.defaultConfig.requestConfig?.headers,
        ...config.headers,
      },
      url: this.createRequestURL(config.url),
    };

    const reqInterceptors = this.interceptors.request.handlers;
    const resInterceptors = this.interceptors.response.handlers;

    if (reqInterceptors.length > 0) {
      reqInterceptors.forEach((reqInterceptor) => {
        requestConfig = reqInterceptor(requestConfig);
      });
    }

    let response = this.baseFetch(requestConfig.url, {
      ...requestConfig,
      signal: !requestConfig?.signal
        ? this.timeoutController().signal
        : requestConfig.signal,
    });

    if (signalTimeoutId) clearTimeout(signalTimeoutId);

    if (resInterceptors.length > 0) {
      resInterceptors.forEach(async (resInterceptor) => {
        const interceptionResult = await resInterceptor(
          response,
          requestConfig,
        );
        response = interceptionResult.response;
        requestConfig = interceptionResult.config;
      });
    }

    return response;
  }
}

export default SuperFetch;
