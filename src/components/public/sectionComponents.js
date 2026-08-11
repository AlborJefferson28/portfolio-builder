import HeroCentered from './HeroCentered.jsx';
import HeroSplit from './HeroSplit.jsx';
import AboutBlock from './AboutBlock.jsx';
import ProjectsGrid from './ProjectsGrid.jsx';
import ProjectsList from './ProjectsList.jsx';
import SkillsTags from './SkillsTags.jsx';
import SkillsBar from './SkillsBar.jsx';
import SkillsRadar from './SkillsRadar.jsx';
import ExperienceTimeline from './ExperienceTimeline.jsx';
import ExperienceCompact from './ExperienceCompact.jsx';
import ContactBlock from './ContactBlock.jsx';

export const SECTION_COMPONENTS = {
  hero: { centered: HeroCentered, split: HeroSplit },
  about: { default: AboutBlock },
  projects: { grid: ProjectsGrid, list: ProjectsList },
  skills: { tags: SkillsTags, bar: SkillsBar, radar: SkillsRadar },
  experience: { timeline: ExperienceTimeline, compact: ExperienceCompact },
  contact: { default: ContactBlock },
};
