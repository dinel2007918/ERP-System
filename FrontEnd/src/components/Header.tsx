type HeaderProps = {
  title: string;
};

function Header({ title }: HeaderProps) {
  return (
    <div className="header">
      <h2>{title}</h2>
    </div>
  );
}

export default Header;