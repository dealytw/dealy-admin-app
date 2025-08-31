import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = `${process.env.STRAPI_URL}/api/merchants?pagination[pageSize]=500&sort=name:asc`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.STRAPI_TOKEN}`,
      },
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

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Merchants GET error:', error)
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Failed to fetch merchants' } },
      { status: 500 }
    )
  }
}
