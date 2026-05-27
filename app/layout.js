import './globals.css'

export const metadata = {
  title: 'PaperGone — AI Document Organizer',
  description: 'Upload chaos, receive organization. AI-powered document management.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
