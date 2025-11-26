import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VisionaryClonesComponent } from './components/visionary-clones/visionary-clones.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  imports: [VisionaryClonesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}