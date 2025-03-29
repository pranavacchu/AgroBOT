import "./globals.css"

export const metadata = {
  title: "AgriBOT - Crop Price Prediction",
  description: "Your intelligent companion for accurate crop price predictions and market insights",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

