import { NextRequest, NextResponse } from 'next/server'

// Helper function to make authenticated requests to Strapi
async function strapiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${process.env.STRAPI_URL}${endpoint}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.STRAPI_TOKEN}`,
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorDetails
    try {
      errorDetails = JSON.parse(errorText)
    } catch {
      errorDetails = { message: errorText }
    }
    throw new Error(errorDetails.error?.message || `HTTP ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filters = searchParams.get('filters')
    
    let endpoint = '/api/coupons?populate[merchant]=*&sort=priority:asc&pagination[pageSize]=500'
    
    if (filters) {
      const filterParams = new URLSearchParams(filters)
      endpoint += `&${filterParams.toString()}`
    }

    const data = await strapiRequest(endpoint)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Coupons GET error:', error)
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Failed to fetch coupons' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await strapiRequest('/api/coupons', {
      method: 'POST',
      body: JSON.stringify({ data: body }),
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Coupons POST error:', error)
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Failed to create coupon' } },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    if (!documentId) {
      return NextResponse.json(
        { error: { message: 'Document ID is required' } },
        { status: 400 }
      )
    }

    const body = await request.json()
    const data = await strapiRequest(`/api/coupons/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: body }),
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Coupons PUT error:', error)
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Failed to update coupon' } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    if (!documentId) {
      return NextResponse.json(
        { error: { message: 'Document ID is required' } },
        { status: 400 }
      )
    }

    await strapiRequest(`/api/coupons/${documentId}`, {
      method: 'DELETE',
    })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Coupons DELETE error:', error)
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Failed to delete coupon' } },
      { status: 500 }
    )
  }
}
