import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { identifier, password } = await request.json()

    // Check against server-side environment variable
    if (password !== process.env.EDITOR_PASSWORD) {
      return NextResponse.json(
        { error: { message: 'Invalid credentials' } },
        { status: 401 }
      )
    }

    // Make request to Strapi using server-side token
    const strapiResponse = await fetch(`${process.env.STRAPI_URL}/api/auth/local`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, password }),
    })

    if (!strapiResponse.ok) {
      const errorData = await strapiResponse.json()
      return NextResponse.json(
        { error: errorData.error || { message: 'Authentication failed' } },
        { status: strapiResponse.status }
      )
    }

    const authData = await strapiResponse.json()
    
    // Return the JWT and user data
    return NextResponse.json({
      jwt: authData.jwt,
      user: authData.user,
    })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
