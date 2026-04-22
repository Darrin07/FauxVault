
/**
 * Note on AI Usage:  Originally this app had CSS files for much of the App, which was detracting from the point
 * of the project.  I asked Claude Code to update the CSS into the theme with a proposed outline and then it helped me walk throug
 * key changes.  I still had to write the code and the wording, but Claude easily saved me 10 hours, as I didn't have to
 * look up everything or guess on my structure, and Claude was able to suggest common color codes for me to trial.
 * Model used:  Claude Code Sonnet 4.6 (Thinking)
 */


import { createTheme, alpha } from '@mui/material/styles'

const theme = createTheme({

    // Colors
    palette: {
        mode: 'dark',

        primary: {
            main: '#6c5ce7',
            light: '#7d6ff0',
            dark: '#5a4bd4',
            contrastText: '#f0f0f5',
        },

        secondary: {
            main: '#3498db',
            light: '#5dade2',
            dark: '#2980b9',
        },
        error: {
            main: '#e74c3c',
            light: '#ec7063',
            dark: '#c0392b',
        },
        success: {
            main: '#27ae60',
            light: '#2ecc71',
            dark: '#1e8449',
        },
        warning: {
            main: '#f39c12',
            light: '#f5b041',
            dark: '#d68910',
        },
        info: {
            main: '#3498db',
        },
        // Background is dark w/white text
        background: {
            default: '#121220',
            paper: '#1e1e34',
        },
        text: {
            primary: '#f0f0f5',
            secondary: '#a0a0b8',
            disabled: '#6c6c8a',
        },
        divider: 'rgba(255, 255, 255, 0.06)',

        //Colors used for our modules being enabled or hardened
        vulnerable: {
            main: '#e74c3c',
            bg: 'rgba(231, 76, 60, 0.12)',
            glow: 'rgba(231, 76, 60, 0.25)',
        },
        hardened: {
            main: '#27ae60',
            bg: 'rgba(39, 174, 96, 0.12)',
            glow: 'rgba(39, 174, 96, 0.25)',
        },
        surface: {
            main: '#1a1a2e',
            card: '#1e1e34',
            cardHover: '#252542',
            input: '#2a2a45',
            inputFocus: '#32325a',
        },
    },

    // Text
    typography: {
        //fonts & weights
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontWeightLight: 300,
        fontWeightRegular: 400,
        fontWeightMedium: 500,
        fontWeightBold: 700,

        //Headers
        h1: {
            fontSize: '2.25rem',
            fontWeight: 700,
            lineHeight: 1.2,
        },
        h2: {
            fontSize: '1.75rem',
            fontWeight: 600,
            lineHeight: 1.2,
        },
        h3: {
            fontSize: '1.375rem',
            fontWeight: 600,
            lineHeight: 1.3,
        },
        h4: {
            fontSize: '1.125rem',
            fontWeight: 600,
            lineHeight: 1.3,
        },

        //Body
        body1: {
            fontSize: '0.9375rem',
            lineHeight: 1.5,
        },
        body2: {
            fontSize: '0.8125rem',
            lineHeight: 1.5,
        },

        //Captions, Buttons, mono
        caption: {
            fontSize: '0.75rem',
            lineHeight: 1.5,
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
        mono: {
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        },
    },

    //Shapes & Shadows
    shape: {
        borderRadius: 10,
    },

    shadows: [
        'none',
        '0 1px 3px rgba(0, 0, 0, 0.25)',           // 1 — sm
        '0 2px 12px rgba(0, 0, 0, 0.35)',           // 2 — card
        '0 4px 24px rgba(0, 0, 0, 0.45)',           // 3 — lg
        '0 8px 32px rgba(0, 0, 0, 0.55)',           // 4 — modal
        '0 0 20px rgba(231, 76, 60, 0.3)',          // 5 — glow-red
        '0 0 20px rgba(39, 174, 96, 0.3)',          // 6 — glow-green
        ...Array(19).fill('none'),                  // 7-24 (MUI expects 25)
    ],

    //Transition information (Similar to React Labs)
    transitions: {
        duration: {
            shortest: 150,
            shorter: 200,
            short: 250,
            standard: 300,
            complex: 400,
        },
        easing: {
            spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        },
    },

    //Components - overrides to components & webkit
    components: {
        MuiCssBaseline: {
            styleOverrides: {

                //Scrollbar specifics
                body: {
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.1) transparent',
                    '&::-webkit-scrollbar': {
                        width: 6,
                    },
                    '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: 9999,
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                        background: 'rgba(255,255,255,0.2)',
                    },
                },
            },
        },

        // Common overide on MuiButton to get the right sizing
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                },
            },
            defaultProps: {
                disableElevation: true,
            },
        },

        // Remove background image on coponents
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },

        // Mui cards should have no background image, standard background
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: '#1e1e34',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 12,
                },
            },
        },

        //Mui text should be small on default, 
        MuiTextField: {
            defaultProps: {
                variant: 'outlined',
                size: 'small',
            },
            styleOverrides: {

                //Update borders and background color on text fields
                root: {
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: '#2a2a45',
                        borderRadius: 8,
                        '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.06)',
                        },
                        '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.12)',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#6c5ce7',
                        },
                    },
                },
            },
        },

        //Update Dialog theme, paper should be dark and not light
        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#1e1e34',
                    backgroundImage: 'none',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 16,
                },
            },
        },

        // Tables should be light grey color for the dark theme
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                },
                head: {
                    fontWeight: 600,
                    color: '#a0a0b8',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                },
            },
        },

        // Switch override for sizing, get red/green on the track
        MuiSwitch: {
            styleOverrides: {
                root: {
                    width: 44,
                    height: 24,
                    padding: 0,
                },
                switchBase: {
                    padding: 2,
                    '&.Mui-checked': {
                        transform: 'translateX(20px)',
                        '& + .MuiSwitch-track': {
                            backgroundColor: '#e74c3c',
                            opacity: 1,
                        },
                        '& .MuiSwitch-thumb': {
                            backgroundColor: '#fff',
                        },
                    },
                },
                thumb: {
                    width: 20,
                    height: 20,
                    backgroundColor: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                },
                track: {
                    borderRadius: 12,
                    backgroundColor: '#27ae60',
                    opacity: 1,
                },
            },
        },

        // Style MuiChip
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                    fontSize: '0.6875rem',
                    height: 24,
                },
            },
        },

        // Style MuiAppBar
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },
    },
})

export default theme
