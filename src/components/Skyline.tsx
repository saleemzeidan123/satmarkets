export default function Skyline({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <g stroke="#8A7342" strokeOpacity="0.30" strokeWidth="1.2" fill="none">
        <path d="M0 175 H1200" />
        <path d="M70 175 V120 H110 V175" />
        <path d="M130 175 V95 H150 L160 80 L170 95 V175" />
        <path d="M210 175 V70 H250 V175 M220 80 H240 M220 95 H240 M220 110 H240" />
        <path d="M300 175 V110 Q330 60 360 110 V175" />
        <path d="M420 175 V60 H470 V175 M430 72 H460 M430 90 H460 M430 108 H460 M430 126 H460" />
        <path d="M520 175 V40 L545 25 L570 40 V175" />
        <path d="M640 175 V95 H690 L700 78 L710 95 V175" />
        <path d="M760 175 V55 H810 V175 M770 70 H800 M770 90 H800 M770 110 H800" />
        <path d="M880 175 V120 Q905 85 930 120 V175" />
        <path d="M980 175 V72 H1020 V175 M990 86 H1010 M990 104 H1010" />
        <path d="M1080 175 V100 H1130 V175" />
      </g>
    </svg>
  );
}
