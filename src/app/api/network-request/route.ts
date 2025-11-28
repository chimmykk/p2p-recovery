import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''
const SHEET_NAME = 'Sheet1'

async function getGoogleSheetsClient() {
  // Build credentials object from environment variables
  const credentials = {
    type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE,
    project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
    private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
    auth_uri: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_URI,
    token_uri: process.env.GOOGLE_SERVICE_ACCOUNT_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_CERT_URL,
    universe_domain: process.env.GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN,
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const sheets = google.sheets({ version: 'v4', auth })
  return sheets
}

export async function POST(request: NextRequest) {
  try {
    const { networkName, chainId } = await request.json()

    if (!networkName || !chainId) {
      return NextResponse.json(
        { error: 'Network name and chain ID are required' },
        { status: 400 }
      )
    }

    const sheets = await getGoogleSheetsClient()

    // Get existing data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:D`,
    })

    const rows = response.data.values || []

    // Check if headers exist, if not create them
    if (rows.length === 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Network Name', 'Chain ID', 'Count', 'Added']],
        },
      })
      rows.push(['Network Name', 'Chain ID', 'Count', 'Added'])
    }

    // Find duplicate (case-insensitive)
    let duplicateIndex = -1
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (
        row[0]?.toLowerCase() === networkName.toLowerCase() &&
        row[1]?.toString() === chainId.toString()
      ) {
        duplicateIndex = i
        break
      }
    }

    if (duplicateIndex !== -1) {
      // Update count for duplicate
      const currentCount = parseInt(rows[duplicateIndex][2] || '1')
      const newCount = currentCount + 1

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!C${duplicateIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[newCount]],
        },
      })

      return NextResponse.json({
        success: true,
        message: `Request count updated to ${newCount}`,
        count: newCount,
        isNew: false,
      })
    } else {
      // Add new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:D`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[networkName, chainId, 1, '']],
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Network request submitted successfully',
        count: 1,
        isNew: true,
      })
    }
  } catch (error: any) {
    console.error('Error submitting network request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit network request' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const sheets = await getGoogleSheetsClient()

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:D`,
    })

    const rows = response.data.values || []

    // Skip header row
    const data = rows.slice(1).map(row => ({
      networkName: row[0] || '',
      chainId: row[1] || '',
      count: parseInt(row[2] || '1'),
      isAdded: row[3]?.toUpperCase() === 'D',
    }))

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error fetching network requests:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch network requests' },
      { status: 500 }
    )
  }
}
