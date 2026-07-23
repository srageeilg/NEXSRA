import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center">
          <div className="rounded-2xl bg-[#070d0a] px-8 py-4">
            <Image
              src="/logo-dark.png"
              alt="NEXSRA"
              width={160}
              height={48}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
