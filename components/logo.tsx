export default function Logo({className = ''}: {className?: string}) {
    return <>
            <span className="p-2 px-2 rounded-md">
                <img src="/logo.png" alt="Logo" width={100} height={100} className={`inline-block ${className}`} />
            </span>
    </>
}