import "./globals.css";
import Login from "./login/Login";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Login />
      </body>
    </html>
  );
}
