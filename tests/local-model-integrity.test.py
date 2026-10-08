import importlib.util, pathlib, tempfile, unittest, hashlib
import numpy as np
from safetensors.numpy import save_file
spec=importlib.util.spec_from_file_location('integrity',pathlib.Path(__file__).resolve().parents[1]/'scripts/verify-local-model.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class IntegrityTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.tmp.name);self.model=self.root/'.local/models/test';self.model.mkdir(parents=True)
  save_file({'layer.self_attn.q_proj.weight':np.zeros((2,2),dtype=np.float32)},str(self.model/'model.safetensors'))
  self.receipt={'trustRemoteCode':False,'revision':'a'*40,'modelId':'local-test','weightsLocation':'.local/models/test','files':{'model.safetensors':hashlib.sha256((self.model/'model.safetensors').read_bytes()).hexdigest()}}
 def tearDown(self):self.tmp.cleanup()
 def test_valid_metadata_without_execution(self):
  r=module.verify_model(self.receipt,self.root);self.assertEqual(r['tensorCount'],1);self.assertFalse(r['weightsExecuted']);self.assertEqual(r['attentionWeightMetadata'][0]['shape'],[2,2])
 def test_modified_weights_rejected(self):
  with (self.model/'model.safetensors').open('ab') as f:f.write(b'changed')
  with self.assertRaises(ValueError):module.verify_model(self.receipt,self.root)
 def test_path_escape_and_remote_code_rejected(self):
  for patch in [{'weightsLocation':'../outside'},{'trustRemoteCode':True},{'files':{'../model.safetensors':'a'*64}}]:
   with self.assertRaises(ValueError):module.verify_model({**self.receipt,**patch},self.root)
 def test_invalid_tensor_format_even_with_matching_hash(self):
  p=self.model/'model.safetensors';p.write_bytes(b'not tensor data');self.receipt['files']['model.safetensors']=hashlib.sha256(p.read_bytes()).hexdigest()
  with self.assertRaises(Exception):module.verify_model(self.receipt,self.root)
if __name__=='__main__':unittest.main()
