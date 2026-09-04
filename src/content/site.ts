// All founder-supplied copy from overview.md. Pages import from here so the
// wording on the site always matches the product spec.

export const SITE = {
    name: "Papa's Puzzles",
    phrase: 'Trade your puzzles for exciting new ones!',
    quote: 'Every finished puzzle deserves a second life, and every puzzler deserves a new challenge.',
    contactEmail: 'info@papaspuzzles.org',
    founder: { name: 'Berkeley Katz', title: "Papa's Puzzles Founder", photo: '/founder.jpg' },
} as const;

export const STEPS = [
    {
        title: 'Donate',
        text: 'Tell us about the puzzles you have finished and upload a photo of each one.',
    },
    {
        title: 'Choose',
        text: 'Browse Explore and pick the puzzle you want next.',
    },
    {
        title: 'Swap',
        text: 'Drop off your puzzles and take your new one home.',
    },
] as const;

export const MISSION =
    "At Papa's Puzzles, we strive to develop a joyful trading system where one can trade in used puzzles and receive exciting new ones! Papa's Puzzles is developing a trading marketplace, where used puzzles can be traded to new puzzlers, while also providing various charities the opportunity to expand their supply – hopefully bringing a smile to someone else's face. Not only are puzzles amazing to do, they help build problem-solving skills, stress management, and can bring people together. Papa's Puzzles is here to inspire connection, creativity, and fun — one piece at a time!";

export const VALUES = [
    {
        title: 'Joy',
        text: "We believe that everything in life should have joy in it. Whether it is hanging out with a friend or clicking submit on the puzzle form, we hope that exchanging Papa's Puzzles will bring a smile to your face.",
    },
    {
        title: 'Excitement',
        text: "With every new trade you experience a certain thrill of receiving a new challenge. Our objective is to have a surprise every time you open a Papa's Puzzles box.",
    },
    {
        title: 'Innovative',
        text: 'We reimagined the puzzle lifecycle through our trading system. We hope to promote a fun and accessible activity to all.',
    },
    {
        title: 'Uplift',
        text: 'We value the power of giving to everybody. Every puzzle donation will be repurposed to a charity that strives to help people. We hope to include everybody who shares the same joys.',
    },
] as const;

export const STORY = [
    {
        title: 'Memories',
        text: 'Berkeley Katz, our founder, has always enjoyed doing puzzles. She goes to Oregon every year where she enjoys beautiful views and early mornings working on puzzles with her grandpa, who also shares this passion. Since then, she has been ordering puzzles and had the problem of not knowing what to do once she has completed them. She could either let them sit around or recycle them for a better cause.',
    },
    {
        title: 'Now it all started',
        text: "Berkeley began to have what almost seemed like an obsession with puzzles. Every spare minute would be her enjoying one. She realized that once she finished one it would just lay around, so she wanted to be able to upcycle while still being able to receive new puzzles! Once she initiated the idea, there was nothing holding her back. Ever since then, she has been so excited for new people to experience the joy and excitement Papa's Puzzles bring.",
    },
] as const;
