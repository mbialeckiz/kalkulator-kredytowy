import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import LandscapeOutlined from '@mui/icons-material/LandscapeOutlined';
import type { SvgIconProps } from '@mui/material';
import type { PropertyKind } from '../state/store';

export function PropertyIcon({ kind, ...props }: { kind: PropertyKind } & SvgIconProps) {
  if (kind === 'dom') return <HomeOutlined {...props} />;
  if (kind === 'dzialka') return <LandscapeOutlined {...props} />;
  return <ApartmentOutlined {...props} />;
}
