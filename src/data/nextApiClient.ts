// Next.js API client for client-side usage
// This replaces the direct Strapi client calls

export class NextApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message)
    this.name = 'NextApiError'
  }
}

export interface AuthResponse {
  jwt: string
  user: {
    id: number
    username: string
    email: string
  }
}

class NextApiClient {
  private jwt: string | null = null

  constructor() {
    // Try to restore JWT from sessionStorage
    this.jwt = sessionStorage.getItem('strapi_jwt')
  }

  setJWT(jwt: string | null) {
    this.jwt = jwt
    if (jwt) {
      sessionStorage.setItem('strapi_jwt', jwt)
    } else {
      sessionStorage.removeItem('strapi_jwt')
    }
  }

  getJWT(): string | null {
    return this.jwt
  }

  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `/api${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Safely merge headers
    if (options.headers) {
      const incomingHeaders = options.headers as Record<string, string>
      Object.assign(headers, incomingHeaders)
    }

    if (this.jwt) {
      headers.Authorization = `Bearer ${this.jwt}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      // Clear JWT and redirect to login
      this.setJWT(null)
      window.location.href = '/login'
      throw new NextApiError('Unauthorized', 401)
    }

    if (!response.ok) {
      const errorText = await response.text()
      let errorDetails
      try {
        errorDetails = JSON.parse(errorText)
      } catch {
        errorDetails = { message: errorText }
      }
      throw new NextApiError(
        errorDetails.error?.message || `HTTP ${response.status}`,
        response.status,
        errorDetails
      )
    }

    if (response.status === 204) {
      return null
    }

    return response.json()
  }

  async login(identifier: string, password: string): Promise<AuthResponse> {
    const result = await this.request('/auth', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    })
    this.setJWT(result.jwt)
    return result
  }

  logout() {
    this.setJWT(null)
    window.location.href = '/login'
  }

  async get(endpoint: string): Promise<any> {
    return this.request(endpoint)
  }

  async post(endpoint: string, data: any): Promise<any> {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async put(endpoint: string, data: any): Promise<any> {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, {
      method: 'DELETE',
    })
  }
}

export const nextApiClient = new NextApiClient()
