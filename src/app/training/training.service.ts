import { Injectable } from "@angular/core";
import { Exercise } from './exercise.model';
import { Subject } from 'rxjs/Subject';
import { AngularFirestore } from 'angularfire2/firestore';

@Injectable()
export class TrainingService {
  exerciseChanged = new Subject<Exercise>();
  exercisesChanged = new Subject<Exercise[]>();
  finishedExercisesChanged = new Subject<Exercise[]>();

  private availableExdercises: Exercise[] = [];
  private runningExercise: Exercise;

  constructor(private db: AngularFirestore) { }

  fetchAvailableExercises() {
    this.db
      .collection('availableExercises')
      .snapshotChanges()                       // event lister which contain some metadata
      .map(docArray => {
        return docArray.map(doc => {
          return {
            id: doc.payload.doc.id,
            name: doc.payload.doc.data().name,
            duration: doc.payload.doc.data().duration,
            calories: doc.payload.doc.data().calories
          };
        })
      })
      .subscribe((exercises: Exercise[]) => {
        this.availableExdercises = exercises;
        this.exercisesChanged.next([...this.availableExdercises]);
      });        
  }

  startExercise(selectedId: string) {
    this.runningExercise = this.availableExdercises.find(
      ex => ex.id === selectedId
    );
    this.exerciseChanged.next({ ...this.runningExercise });
  }

  completeExercise() {
    this.addDataToDatabase({ 
      ...this.runningExercise, 
      date: new Date(), 
      state: 'completed'
    });                                      // Push runningExercise to array before we set them to null and remove them
    this.runningExercise = null;           
    this.exerciseChanged.next(null);         // This will mean we got no running exercise
  }

  cancelExercise(progress: number) {
    this.addDataToDatabase({ 
      ...this.runningExercise, 
      duration: this.runningExercise.duration * (progress / 100),
      calories: this.runningExercise.calories * (progress / 100),
      date: new Date(), 
      state: 'cancelled'
    });                  
    this.runningExercise = null;           
    this.exerciseChanged.next(null); 
  }

  getRunningExercise() {
    return { ...this.runningExercise };
  }

  fetchCompletedOrCancelledExercises() {
    this.db.collection('finishedExercises').valueChanges().subscribe(
      (exercises: Exercise[]) => {
        this.finishedExercisesChanged.next(exercises);
      }
    );                                                              // valueChanges() give us array of document values without id of doc
  }

  private addDataToDatabase(exercise: Exercise) {
    this.db.collection('finishedExercises').add(exercise);
  }
}