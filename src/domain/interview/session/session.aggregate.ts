import { AnswerNotAllowedInCurrentStateError, DuplicateEvaluationError, InvalidStateTransitionError, ParticipantValidationError, SessionAlreadyTerminatedError } from "./errors";
import { InterviewSessionProps, InterviewSessionStatus, SessionAnswer, SessionEvaluation, SessionFeedback, SessionQuestion } from "./types";
  
  export class InterviewSession {
    private props: InterviewSessionProps;
  
    constructor(props: InterviewSessionProps) {
      this.validateParticipant(props);
      this.validateEntryPoint(props);
      this.props = props;
    }
  
    public get state(): Readonly<InterviewSessionProps> {
      return this.props;
    }
  
    public start(now: string): void {
      this.ensureNotTerminated();
      this.assertStatus("IDLE");
      this.props.status = "ASKING";
      this.props.startedAt = now;
      this.bumpVersion();
    }
  
    public deliverQuestion(question: SessionQuestion): void {
      this.ensureNotTerminated();
      this.assertStatus("ASKING");
      this.props.questions.push(question);
      this.bumpVersion();
    }
  
    public receiveAnswer(answer: SessionAnswer): void {
      this.ensureNotTerminated();
      if (this.props.status !== "ASKING") {
        throw new AnswerNotAllowedInCurrentStateError(
          "Answer can only be received in ASKING state"
        );
      }
      this.props.answers.push(answer);
      this.props.status = "EVALUATING";
      this.bumpVersion();
    }
  
    public storeEvaluation(evaluation: SessionEvaluation): void {
      this.ensureNotTerminated();
      this.assertStatus("EVALUATING");
  
      const alreadyEvaluated = this.props.evaluations.some(
        (e) => e.answerId === evaluation.answerId
      );
      if (alreadyEvaluated) {
        throw new DuplicateEvaluationError("Answer already evaluated");
      }
  
      this.props.evaluations.push(evaluation);
      this.props.status = "FEEDBACKING";
      this.bumpVersion();
    }
  
    public addFeedback(feedback: SessionFeedback): void {
      this.ensureNotTerminated();
      this.assertStatus("FEEDBACKING");
      this.props.feedbackItems.push(feedback);
      this.bumpVersion();
    }
  
    public nextOrComplete(now: string): void {
      this.ensureNotTerminated();
      this.assertStatus("FEEDBACKING");
  
      const answeredQuestions = this.props.answers.length;
      if (answeredQuestions < this.props.totalQuestions) {
        this.props.currentQuestionIndex += 1;
        this.props.status = "ASKING";
      } else {
        this.props.status = "COMPLETED";
        this.props.endedAt = now;
      }
      this.bumpVersion();
    }
  
    public cancel(now: string): void {
      this.ensureNotTerminated();
      this.props.status = "CANCELLED";
      this.props.endedAt = now;
      this.bumpVersion();
    }
  
    public fail(now: string): void {
      this.ensureNotTerminated();
      this.props.status = "FAILED";
      this.props.endedAt = now;
      this.bumpVersion();
    }
  
    private ensureNotTerminated(): void {
      if (this.isTerminal(this.props.status)) {
        throw new SessionAlreadyTerminatedError(
          `Session is terminal: ${this.props.status}`
        );
      }
    }
  
    private assertStatus(expected: InterviewSessionStatus): void {
      if (this.props.status !== expected) {
        throw new InvalidStateTransitionError(
          `Expected ${expected}, got ${this.props.status}`
        );
      }
    }
  
    private isTerminal(status: InterviewSessionStatus): boolean {
      return status === "COMPLETED" || status === "CANCELLED" || status === "FAILED";
    }
  
    private bumpVersion(): void {
      this.props.version += 1;
    }
  
    private validateParticipant(props: InterviewSessionProps): void {
      const p = props.participant;
      if (p.type === "authenticated" && !p.userId) {
        throw new ParticipantValidationError(
          "participant.userId is required for authenticated participants"
        );
      }
    }
  
    private validateEntryPoint(props: InterviewSessionProps): void {
      if (props.entryPoint.mode === "shared_link" && !props.entryPoint.accessLinkId) {
        throw new ParticipantValidationError(
          "entryPoint.accessLinkId is required for shared_link sessions"
        );
      }
    }
  }