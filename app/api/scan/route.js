import { NextResponse } from 'next/server'

const DEFAULT_FIELDS = {
  receipt: [
    { key: 'Store', value: '' },
    { key: 'Total amount', value: '' },
    { key: 'Date', value: '' },
    { key: 'Payment method', value: '' },
  ],
  bill: [
    { key: 'Company', value: '' },
    { key: 'Amount due', value: '' },
    { key: 'Due date', value: '' },
    { key: 'Account number', value: '' },
  ],
  invoice: [
    { key: 'From', value: '' },
    { key: 'Invoice number', value: '' },
    { key: 'Amount', value: '' },
    { key: 'Due date', value: '' },
  ],
  contract: [
    { key: 'Parties', value: '' },
    { key: 'Start date', value: '' },
    { key: 'End date', value: '' },
    { key: 'Value', value: '' },
  ],
  warranty: [
    { key: 'Product', value: '' },
    { key: 'Brand', value: '' },
    { key: 'Purchase date', value: '' },
    { key: 'Expires', value: '' },
  ],
  id: [
    { key: 'Full name', value: '' },
    { key: 'Document number', value: '' },
    { key: 'Expiry date', value: '' },
    { key: 'Issued by', value: '' },
  ],
  medical: [
    { key: 'Doctor/Hospital', value: '' },
    { key: 'Date', value: '' },
    { key: 'Diagnosis/Treatment', value: '' },
    { key: 'Follow-up', value: '' },
  ],
  tax: [
    { key: 'Tax year', value: '' },
    { key: 'Amount', value: '' },
    { key: 'Deadline', value: '' },
    { key: 'Reference', value: '' },
  ],
  insurance: [
    { key: 'Provider', value: '' },
    { key: 'Policy number', value: '' },
    { key: 'Coverage', value: '' },
    { key: 'Renewal date', value: '' },
  ],
  note: [
    { key: 'Subject', value: '' },
    { key: 'Date', value: '' },
  ],
  other: [
    { key: 'Description', value: '' },
    { key: 'Date', value: '' },
    { key: 'Reference', value: '' },
  ],
}

const DEFAULT_FOLDERS = {
  receipt: 'Receipts',
  bill: 'Bills',
  invoice: 'Invoices',
  contract: 'Contracts',
  warranty: 'Warranties',
  id: 'IDs',
  medical: 'Medical',
  tax: 'Tax',
  insurance: 'Insurance',
  note: 'Notes',
  other: 'Other',
}

export async function POST(request) {
  try {
    const { mediaType } = await request.json()

    // Guess type from media type
    const type = 'other'

    return NextResponse.json({
      type,
      title: '',
      summary: '',
      fields: DEFAULT_FIELDS[type],
      folder: DEFAULT_FOLDERS[type],
      reminder: null,
      tags: [],
      defaultFields: DEFAULT_FIELDS,
      defaultFolders: DEFAULT_FOLDERS,
    })
  } catch (err) {
    return NextResponse.json({
      type: 'other',
      title: '',
      summary: '',
      fields: DEFAULT_FIELDS['other'],
      folder: 'Other',
      reminder: null,
      tags: [],
      defaultFields: DEFAULT_FIELDS,
      defaultFolders: DEFAULT_FOLDERS,
    })
  }
}
