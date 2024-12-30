/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{html,js}"],
    theme: {
        extend: {
            height: {
                1: '0.25rem',
                18: '4.5rem',
                30: '7.5rem',
                100: '25rem',
                150: '37.5rem'
            },
            borderWidth: {
                1: '1px'
            }
        },
    },
    plugins: [],
}