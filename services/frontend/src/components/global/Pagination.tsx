import Spinner from "./Spinner";

interface IPaginationProps {
  defaultCurrent: number;
  defaultPageSize: number;
  onChange: any;
  total: number;
  loading: boolean;
}

const Pagination = (props: IPaginationProps) => {
  const { defaultCurrent, onChange, total, loading } = props;

  return (
    <div className="text-center">
      <span className="block mb-5 text-sm">{`showing ${defaultCurrent} of ${total}`}</span>
      <button
        className="inline-flex items-center px-4 py-2 border border-transparent
        text-xs font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        type="button"
        disabled={loading}
        onClick={() => onChange()}
      >
        {loading ? <Spinner className="w-4 h-4" /> : <span>load more</span>}
      </button>
    </div>
  );
};

export default Pagination;
