import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center">
          <div className="rounded-2xl bg-[#070d0a] px-10 py-5">
            <Image
              src="/logo-dark.png"
              alt="NEXSRA"
              width={220}
              height={66}
              className="h-16 w-auto object-contain"
              priority
            />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
