export class InvalidStateTransitionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvalidStateTransitionError";
    }
}
  
export class SessionAlreadyTerminatedError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "SessionAlreadyTerminatedError";
    }
}
  
export class AnswerNotAllowedInCurrentStateError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AnswerNotAllowedInCurrentStateError";
    }
}
  
export class DuplicateEvaluationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "DuplicateEvaluationError";
    }
}
  
export class ParticipantValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ParticipantValidationError";
    }
}