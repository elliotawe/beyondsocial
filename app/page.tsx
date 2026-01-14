import Navigation from "@/components/public/home/navigation"
import Hero from "@/components/public/home/hero"
import HowItWorks from "@/components/public/home/how-it-works"
import Features from "@/components/public/home/features"
import Showcase from "@/components/public/home/showcase"
import UseCases from "@/components/public/home/use-cases"
import Footer from "@/components/public/home/footer"

export default function Page() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navigation />
            <Hero />
            <HowItWorks />s
            <Features />
            <Showcase />
            <UseCases />
            <Footer />
        </div>
    );
}