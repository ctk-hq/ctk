interface ILogoProps {
  className: string;
}

const Logo = (props: ILogoProps) => {
  const { className } = props;
  return (
    <svg width="689" height="689" viewBox="0 0 689 689" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path opacity="0.8" d="M191.04 268.58H0.154419L0.154419 459.465H191.04V268.58Z" fill="white" />
      <path opacity="0.8" d="M191.04 497.306H0.154419L0.154419 688.192H191.04V497.306Z" fill="white" />
      <path opacity="0.8" d="M191.04 39.8536L0.154419 39.8536L0.154419 230.739H191.04V39.8536Z" fill="#4F95FF" />
      <path opacity="0.8" d="M419.766 268.58H228.881V459.465H419.766V268.58Z" fill="#4F95FF" />
      <path opacity="0.8" d="M419.766 497.306H228.881V688.192H419.766V497.306Z" fill="#4F95FF" />
      <path opacity="0.8" d="M648.493 497.306H457.607V688.192H648.493V497.306Z" fill="white" />
      <path opacity="0.8" d="M688.084 135.105L553.109 0.130157L418.134 135.105L553.109 270.081L688.084 135.105Z" fill="white" />
    </svg>
  )
}

export default Logo;