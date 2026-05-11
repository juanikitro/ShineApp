type EmptyProps = {
	text: string
}

export function Empty({ text }: EmptyProps) {
	return <div className="empty">{text}</div>
}
