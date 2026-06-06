import { headers } from "next/headers";
import Hero from "@/components/Hero";
import ArrivalBoard from "@/components/ArrivalBoard";
import CityLiveMap from "@/components/CityLiveMap";
import { FEATURED_STOP_ID } from "@/lib/types";

export default async function HomePage() {
  const h = await headers();
  const locale = h.get("x-locale") === "ka" ? "ka" : "en";
  return (
    <>
      <Hero locale={locale} />
      <section className="mx-auto w-full max-w-7xl pb-10">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-fg">
              {locale === "ka" ? "ცოცხალი რუკა" : "Live map"}
            </h2>
            <p className="text-2xs text-fg-dim">
              {locale === "ka"
                ? "ყველა ავტობუსი და მიკროავტობუსი რეალურ დროში"
                : "Every bus and minibus, live"}
            </p>
          </div>
        </div>
        <CityLiveMap locale={locale} />
      </section>
      <section className="mx-auto max-w-3xl px-0 pb-16">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-fg">
              {locale === "ka" ? "რჩეული გაჩერება" : "Featured stop"}
            </h2>
            <p className="text-2xs text-fg-dim">Beri Gabriel Salosi · #120</p>
          </div>
        </div>
        <ArrivalBoard stopId={FEATURED_STOP_ID} locale={locale} />
      </section>
    </>
  );
}
