'use client';

import "./globals.css";
import { Context, createContext, ReactElement, useMemo } from "react";
import { IRootLayout } from "@/interfaces/root-layout.interface";

const context: Context<{ name: string }> = createContext({ name: `default` });

export default function RootLayout({
  children
}: Readonly<IRootLayout>): ReactElement {
  const contextValue: { name: string } = useMemo(() => ({ name: `Lmao` }), []);

  return (
    <html lang="en">
      <body>
        <context.Provider value={contextValue}>
          {children}
        </context.Provider>
      </body>
    </html>
  );
}
