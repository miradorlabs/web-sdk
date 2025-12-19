import { Observable } from "rxjs";

interface Metadata {
  [key: string]: string;
}

interface Rpc {
  request(
    service: string,
    method: string,
    data: Uint8Array,
    metadata?: Metadata
  ): Promise<Uint8Array>;
  clientStreamingRequest(
    service: string,
    method: string,
    data: Observable<Uint8Array>
  ): Promise<Uint8Array>;
  serverStreamingRequest(
    service: string,
    method: string,
    data: Uint8Array
  ): Observable<Uint8Array>;
  bidirectionalStreamingRequest(
    service: string,
    method: string,
    data: Observable<Uint8Array>
  ): Observable<Uint8Array>;
}

export class GrpcWebRpc implements Rpc {
  private url: string;
  private apiKey?: string;

  constructor(url: string, apiKey?: string) {
    this.url = url;
    this.apiKey = apiKey;
  }

  async request(
    service: string,
    method: string,
    data: Uint8Array,
    metadata?: Metadata
  ): Promise<Uint8Array> {
    console.log(`[gRPC-Web] Making request to ${this.url}/${service}/${method}`);

    const headers: HeadersInit = {
      'Content-Type': 'application/grpc-web+proto',
      'X-Grpc-Web': '1',
    };

    // Add API key to headers if provided
    if (this.apiKey) {
      headers['x-parallax-api-key'] = this.apiKey;
    }

    // Add custom metadata
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        headers[key] = value;
      });
    }

    try {
      const response = await fetch(`${this.url}/${service}/${method}`, {
        method: 'POST',
        headers,
        body: data.buffer as ArrayBuffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`gRPC-Web error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log(`[gRPC-Web] Success from ${this.url}/${service}/${method}`);
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error(
        `[gRPC-Web] Error from ${this.url}/${service}/${method}:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  clientStreamingRequest(): Promise<Uint8Array> {
    throw new Error("Client streaming not yet implemented for gRPC-Web");
  }

  serverStreamingRequest(
    service: string,
    method: string,
    data: Uint8Array
  ): Observable<Uint8Array> {
    return new Observable((subscriber) => {
      const headers: HeadersInit = {
        'Content-Type': 'application/grpc-web+proto',
        'X-Grpc-Web': '1',
      };

      // Add API key to headers if provided
      if (this.apiKey) {
        headers['x-parallax-api-key'] = this.apiKey;
      }

      fetch(`${this.url}/${service}/${method}`, {
        method: 'POST',
        headers,
        body: data.buffer as ArrayBuffer,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`gRPC-Web error: ${response.status} ${response.statusText}`);
          }

          if (!response.body) {
            throw new Error('Response body is null');
          }

          const reader = response.body.getReader();

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                subscriber.complete();
                break;
              }

              if (value) {
                subscriber.next(value);
              }
            }
          } catch (error) {
            subscriber.error(error);
          }
        })
        .catch((error) => {
          subscriber.error(error);
        });

      return () => {
        // Cleanup logic if needed
      };
    });
  }

  bidirectionalStreamingRequest(): Observable<Uint8Array> {
    throw new Error("Bidirectional streaming not yet implemented for gRPC-Web");
  }
}
