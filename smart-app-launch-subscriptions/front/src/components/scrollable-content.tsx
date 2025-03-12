interface ModalContentProps {
  header: React.ReactNode
  body: React.ReactNode
}

export const ScrollableContent = ({ header, body }: ModalContentProps) => {
  return (
    <div style={{ padding: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ paddingBottom: 16, borderBottom: '1px solid #ddd', background: '#fff' }}>
        {header}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
        {body}
      </div>
    </div>
  )
}