import './Toggle.css'

export default function Toggle({ checked, onChange, id}) {
    return (
        <button
        id={id}
        role="switch"
        className={`toggle ${checked ? 'toggle--on' : 'toggle--off'}`}
        onClick={() => onChange?.(!checked)}
        >
            <span className='toggle__track'>
                <span className='toggle__thumb'/>
            </span>
        </button>
    )
}