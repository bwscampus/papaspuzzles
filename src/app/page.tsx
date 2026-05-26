import Link from "next/link";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import { ArrowRight, Puzzle, RefreshCw, Heart } from "lucide-react";

export default function Home() {
    return (
        <div className="min-h-screen bg-white flex flex-col">
            <Navbar />

            {/* Hero */}
            <section className="relative w-full bg-[#1a1a2e] overflow-hidden">
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                >
                    <source src="/hero.mp4" type="video/mp4" />
                    <source src="/hero.mov" type="video/quicktime" />
                </video>
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-6 py-24 text-center">
                    <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl mb-8">
                        <Image
                            src="/logo.png"
                            alt="Papa's Puzzles Logo"
                            fill
                            className="object-cover object-center scale-[1.6]"
                            priority
                        />
                    </div>
                    <p className="text-white/60 uppercase tracking-[0.3em] text-sm font-medium mb-4">
                        Welcome to
                    </p>
                    <h1 className="text-7xl md:text-8xl font-extrabold text-white leading-tight mb-6">
                        Papa&apos;s<br />Puzzles
                    </h1>
                    <p className="text-xl text-white/70 max-w-xl mb-10 leading-relaxed">
                        A localized peer-to-peer trading platform for puzzle lovers — trade your completed puzzles for exciting new challenges.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link
                            href="/trade"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-full text-lg font-bold hover:bg-red-400 transition-all transform hover:scale-105 shadow-xl"
                        >
                            Start a Trade <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            href="/donate"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-primary rounded-full text-lg font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
                        >
                            Donate Now
                        </Link>
                        <Link
                            href="/redeem"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-white/10 text-white border border-white/30 rounded-full text-lg font-bold hover:bg-white/20 transition-all"
                        >
                            Use My Credits
                        </Link>
                    </div>
                </div>
                {/* Wave divider */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 60L1440 60L1440 0C1440 0 1080 60 720 60C360 60 0 0 0 0L0 60Z" fill="white"/>
                    </svg>
                </div>
            </section>

            {/* How it works */}
            <section className="py-20 px-6 bg-white">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-4xl font-bold text-center text-gray-900 mb-2">How It Works</h2>
                    <p className="text-center text-gray-500 mb-14">Three simple steps to join the community</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-gray-50 hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Puzzle className="w-7 h-7 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">1. Donate</h3>
                            <p className="text-gray-500">List a completed puzzle you&apos;re ready to pass on to a new puzzler.</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-gray-50 hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <RefreshCw className="w-7 h-7 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">2. Choose</h3>
                            <p className="text-gray-500">Browse our inventory and pick a fresh challenge for yourself.</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-gray-50 hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Heart className="w-7 h-7 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">3. Swap</h3>
                            <p className="text-gray-500">We coordinate the exchange — and extras go to charities in need.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Story — three columns matching Wix */}
            <section className="py-20 px-6 bg-[#f8f6f2]">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div>
                        <h2 className="text-2xl font-bold text-primary mb-4">Our Mission</h2>
                        <p className="text-gray-600 leading-relaxed">
                            At Papa&apos;s Puzzles, we strive to develop a joyful trading system where one can trade in
                            used puzzles and receive exciting new ones. We&apos;re building a trading marketplace where
                            used puzzles reach new puzzlers, while also giving charities the opportunity to expand their
                            supply — hopefully bringing a smile to someone else&apos;s face. Not only are puzzles amazing
                            to do, they build problem-solving skills, ease stress, and bring people together.
                        </p>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-primary mb-4">Memories</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Berkeley Katz, our founder, has always enjoyed doing puzzles. She goes to Oregon every year
                            where she enjoys beautiful views and early mornings working on puzzles with her grandpa, who
                            also shares this passion. Since then, she has been ordering puzzles and had the problem of
                            not knowing what to do once she has completed them — let them sit around, or recycle them
                            for a better cause.
                        </p>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-primary mb-4">How It Started</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Berkeley began to have what almost seemed like an obsession with puzzles. Every spare minute
                            would be her enjoying one. She realized that once she finished one it would just lay around,
                            so she wanted to upcycle while still receiving new puzzles. Once she initiated the idea,
                            there was nothing holding her back — ever since, she has been excited for new people to
                            experience the joy Papa&apos;s Puzzles brings.
                        </p>
                        <Link href="/about" className="inline-flex items-center gap-1 mt-5 text-primary font-semibold hover:underline text-sm">
                            Read more <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Founder message */}
            <section className="py-24 px-6 bg-white text-center">
                <div className="max-w-2xl mx-auto">
                    <p className="text-primary uppercase tracking-widest text-sm font-semibold mb-4">A Message From Our Founder</p>
                    <h2 className="text-4xl md:text-5xl font-light text-gray-800 leading-tight mb-8">
                        &ldquo;Every finished puzzle deserves a second life — and every puzzler deserves a new challenge.&rdquo;
                    </h2>
                    <div className="flex items-center justify-center gap-4">
                        <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-primary/20">
                            <Image
                                src="/logo.png"
                                alt="Berkeley Katz"
                                fill
                                className="object-cover object-center scale-[1.6]"
                            />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-gray-800">Berkeley Katz</p>
                            <p className="text-sm text-gray-500">Founder, Papa&apos;s Puzzles</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA banner */}
            <section className="py-16 px-6 bg-primary text-white text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-3xl font-bold mb-3">Ready to trade your first puzzle?</h2>
                    <p className="text-white/80 mb-8">Join our local community and give your completed puzzles a second life.</p>
                    <Link
                        href="/trade"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-white text-primary rounded-full text-lg font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                    >
                        Get Started <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            <footer className="py-8 text-center text-sm text-gray-400 bg-white border-t border-gray-100">
                <p>© {new Date().getFullYear()} Papa&apos;s Puzzles. Spreading joy one piece at a time.</p>
            </footer>
        </div>
    );
}
